var Animation = (animateIcons, pointer, settings) => {
  let [px, py] = pointer;
  let _firstIcon = animateIcons[0];
  let _secondIcon = animateIcons[1];
  let _lastIcon = animateIcons[animateIcons.length - 1];
  let first = _firstIcon._pos || [0, 0];
  let second = _secondIcon._pos || [0, 0];
  let last = _lastIcon._pos || [0, 0];
  let nsz = _firstIcon.width;

  let sz = nsz * (6 + 2 * settings.animation_spread);
  let szr = sz / 2;
  let center = [px, first[1]];

  if (settings.vertical) {
    center = [first[0], py];
  }

  function compute_d(i) {
    let dx = i._pos[0] - center[0];
    if (settings.vertical) {
      dx = i._pos[1] - center[1];
    }
    let dst = dx * dx;
    if (dst < szr * szr) {
      let dd = 1.0 - Math.abs(dx) / szr;
      i._d = nsz + nsz * settings.animation_magnify * settings.scaleFactor * dd;
    }
    return i;
  }

  // max scale
  // let max1 = compute_d({_pos:center})._d / nsz;
  // let max2 = compute_d({_pos:[center[0] + settings.iconSpacing, center[1]]})._d / nsz;
  // let max3 = compute_d({_pos:[center[0] + settings.iconSpacing*2, center[1]]})._d / nsz;
  // log(`${max1} ${max2} ${max3}`);

  // compute diameter
  animateIcons.forEach((i) => {
    i._d = nsz;

    // distance
    compute_d(i);

    i._pos2 = [...i._pos];
    i._targetScale = i._d / nsz;

    // rise
    if (settings.vertical) {
      if (settings.position == 1) {
        i._pos2[0] -= (i._d - nsz) * 0.8 * settings.animation_rise;
      } else {
        i._pos2[0] += (i._d - nsz) * 0.8 * settings.animation_rise;
      }
    } else {
      i._pos2[1] -= (i._d - nsz) * 0.8 * settings.animation_rise;
    }
  });

  let w1 = last[0] - first[0];
  let w2 =
    animateIcons[animateIcons.length - 1]._pos2[0] - animateIcons[0]._pos2[0];

  animateIcons.forEach((i) => {
    i._pos = i._pos2;
    i._targetSpread = Math.floor(
      settings.iconSpacing * settings.scaleFactor * i._targetScale
    );
  });

  let debugDraw = [];
  debugDraw = animateIcons.map((i) => ({
    t: 'circle',
    x: i._pos[0],
    y: i._pos[1],
    d: i._d,
    c: [1, 0, 0, 1],
  }));

  // debugDraw = debugDraw.splice(0,2);

  debugDraw.push({
    t: 'circle',
    x: center[0],
    y: center[1],
    d: sz,
    c: [1, 1, 0, 1],
  });

  // debugDraw.push({
  //   t: 'line',
  //   x: first[0],
  //   y: first[1],
  //   x2: last[1],
  //   y2: last[1],
  //   c: [1, 0, 1, 1],
  // });

  let max = nsz + nsz * settings.animation_magnify * settings.scaleFactor;

  return {
    first,
    last,
    padLeft: 0,
    padRight: 0,
    debugDraw,
  };
};
