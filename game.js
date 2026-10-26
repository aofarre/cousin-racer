(function (root) {
  var COUSINS = ['Bobby', 'Mila', 'Luke', 'Dinny', 'Bill', 'Tony'];
  var KEY = 'cousinRacer.wins.v1';
  var START = 0.12; // fraction of lane where racers begin crossing the start line

  function pickWinner(rand) {
    return Math.floor((rand || Math.random)() * COUSINS.length);
  }

  function loadTally(storage) {
    var t = {};
    COUSINS.forEach(function (n) { t[n] = 0; });
    try {
      var s = JSON.parse(storage.getItem(KEY) || '{}');
      COUSINS.forEach(function (n) {
        if (Number.isInteger(s[n]) && s[n] > 0) t[n] = s[n];
      });
    } catch (e) {}
    return t;
  }

  function saveTally(storage, t) {
    try { storage.setItem(KEY, JSON.stringify(t)); } catch (e) {}
  }

  // Cosmetic race plan: the winner is chosen first; everyone gets wobbly, lead-changing motion.
  function planRace(winner, rand) {
    rand = rand || Math.random;
    return COUSINS.map(function (n, i) {
      return {
        duration: i === winner ? 6000 : 6300 + rand() * 900,
        amp: 0.05 + rand() * 0.07,
        k: 2 + Math.floor(rand() * 3),
        phase: rand() * 6.28
      };
    });
  }

  function progress(p, t) {
    var u = Math.min(1, t / p.duration);
    if (u >= 1) return 1;
    var wob = p.amp * Math.sin(Math.PI * p.k * u) * Math.sin(Math.PI * u);
    return Math.max(0, Math.min(1, u + wob));
  }

  var api = { COUSINS: COUSINS, KEY: KEY, pickWinner: pickWinner, loadTally: loadTally,
              saveTally: saveTally, planRace: planRace, progress: progress };
  if (typeof module !== 'undefined') module.exports = api;
  root.CousinRacer = api;
  if (typeof document === 'undefined' || !document.getElementById('track')) return;

  var $ = function (id) { return document.getElementById(id); };
  var img = function (n) { return 'assets/' + n.toLowerCase() + '.png'; };
  var tally = loadTally(root.localStorage);
  var racing = false, runners = [], lanes = [];

  var track = $('track');
  COUSINS.forEach(function (n) {
    var lane = document.createElement('div');
    lane.className = 'lane';
    lane.innerHTML = '<span class="start"></span><span class="finish"></span>' +
      '<div class="runner"><img src="' + img(n) + '" alt="' + n + '"><span>' + n + '</span></div>';
    track.appendChild(lane);
    lanes.push(lane);
    runners.push(lane.querySelector('.runner'));
  });

  function place(i, frac) {
    var lane = lanes[i], r = runners[i];
    var w = lane.clientWidth, rw = r.offsetWidth;
    var from = 4, to = w - rw - 14;
    r.style.left = (from + (to - from) * frac) + 'px';
  }
  function resetPositions() {
    runners.forEach(function (r, i) { r.className = 'runner'; place(i, 0); });
  }

  function renderTally() {
    var max = Math.max.apply(null, COUSINS.map(function (n) { return tally[n]; }));
    $('tally').innerHTML = COUSINS.map(function (n) {
      return '<li class="' + (max > 0 && tally[n] === max ? 'lead' : '') + '"><img src="' + img(n) +
        '" alt=""><span>' + n + '</span><b>' + tally[n] + '</b></li>';
    }).join('');
  }

  function countdown(done) {
    var el = $('countdown'), c = $('count'), n = 3;
    el.hidden = false;
    (function step() {
      if (n === 0) { el.hidden = true; done(); return; }
      c.textContent = n;
      c.style.animation = 'none'; void c.offsetWidth; c.style.animation = '';
      n--;
      setTimeout(step, 900);
    })();
  }

  function confetti() {
    var box = $('confetti'), colors = ['#ff4d4d', '#ffd23f', '#3ec1d3', '#7bd36b', '#b57bff'];
    box.innerHTML = '';
    for (var i = 0; i < 40; i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = (1.5 + Math.random() * 1.5) + 's';
      p.style.animationDelay = Math.random() * 0.6 + 's';
      box.appendChild(p);
    }
  }

  function finish(winner) {
    var name = COUSINS[winner];
    tally[name]++;
    saveTally(root.localStorage, tally);
    renderTally();
    runners.forEach(function (r) { r.classList.remove('running'); });
    runners[winner].classList.add('won');
    $('winner-img').src = img(name);
    $('winner-img').alt = name;
    $('winner-name').textContent = name;
    confetti();
    setTimeout(function () { $('winner').hidden = false; $('again').focus(); }, 700);
  }

  function run(winner) {
    var plan = planRace(winner), t0 = performance.now(), last = plan.map(function () { return 0; });
    runners.forEach(function (r) { r.classList.add('running'); });
    (function frame(now) {
      var t = now - t0, all = true;
      plan.forEach(function (p, i) {
        var f = Math.max(last[i], progress(p, t));
        last[i] = f;
        place(i, f);
        if (f < 1) all = false;
      });
      if (all) { racing = false; $('go').disabled = false; finish(winner); }
      else requestAnimationFrame(frame);
    })(t0);
  }

  function start() {
    if (racing) return;
    racing = true;
    $('go').disabled = true;
    $('winner').hidden = true;
    resetPositions();
    var winner = pickWinner();
    countdown(function () { run(winner); });
  }

  $('go').onclick = start;
  $('again').onclick = function () { $('winner').hidden = true; resetPositions(); $('go').focus(); };
  $('reset').onclick = function () { $('confirm').hidden = false; $('confirm-no').focus(); };
  $('confirm-no').onclick = function () { $('confirm').hidden = true; };
  $('confirm-yes').onclick = function () {
    COUSINS.forEach(function (n) { tally[n] = 0; });
    saveTally(root.localStorage, tally);
    renderTally();
    $('confirm').hidden = true;
  };
  root.addEventListener('resize', function () { if (!racing) resetPositions(); });
  renderTally();
  resetPositions();
  root.addEventListener('load', function () { if (!racing) resetPositions(); });
})(typeof window !== 'undefined' ? window : globalThis);



