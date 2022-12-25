function gen_frames(settings) {
  let { iconsCount, iconSize, iconSpacing, pointer, width, height, debugDraw } =
    settings;

  let iconSpacingX = iconSpacing + (iconSpacing * 0.2 * settings.animation_spread);
  let iconSpacingY = iconSpacing;

  let frames = [];
  for (let i = 0; i < iconsCount; i++) {
    frames.push({
      idx: i,
      x: 0,
      y: 0,
      w: iconSpacingX,
      h: iconSpacingY,
      p: 1,
    });
  }

  function totalWidth() {
    let tw = 0;
    frames.forEach((f) => {
      tw += f.w;
    });
    return tw;
  }

  function reposition() {
    let tw = totalWidth();
    let x1 = width / 2 - tw / 2;
    let y1 = height - iconSpacing - 8;
    frames.forEach((f) => {
      f.x = x1;
      f.y = y1;
      x1 += f.w;
    });
  }

  reposition();

  if (pointer) {
    let left = [];
    let center = [];
    let right = [];

    let thresh = iconSpacingX * 3;
    let thresh2 = thresh / 2;
    let cx = pointer[0];
    let cy = pointer[1];
    let ccy = 0;

    let doLeft = true;
    let doRight = false;
    let totalP = 0;

    frames.forEach((f) => {
      let ix = f.x + f.w / 2;
      let iy = f.y + f.h / 2;
      ccy = iy;
      let dx = ix - cx;
      dx = Math.sqrt(dx * dx);
      let dy = iy - cy;
      dy = Math.sqrt(dy * dy);
      f.p = 1;
      if (dx < thresh2 && dy < iconSpacingX) {
        f.in = true;
        let p = 1 - dx / thresh2;
        f.p = 1 + p * 0.8;
        totalP += f.p;
        doLeft = false;
        center.push(f);
      } else {
        if (!doLeft) {
          doRight = true;
        }
      }
      if (doLeft) {
        left.push(f);
      }
      if (doRight) {
        right.push(f);
      }
    });

    if (totalP > 0) {
      let tw = (iconsCount + 1) * iconSpacingX;
      let x1 = width / 2 - tw / 2;
      let leftX = x1;
      left.forEach((f) => {
        f.x = x1;
        x1 += f.w;
        leftX = x1;
      });
      x1 = width / 2 + tw / 2 - right.length * iconSpacingX;
      right.forEach((f) => {
        f.x = x1;
        x1 += f.w;
      });
      let rightX =
        leftX + (iconsCount - left.length - right.length + 1) * iconSpacingX;
      let area = rightX - leftX;

      debugDraw.push({
        t: 'line',
        x: leftX,
        y: ccy,
        x2: rightX,
        y2: ccy,
        c: [1, 0, 0, 1],
      });

      let usedArea = 0;
      center.forEach((f) => {
        f.x = leftX;
        f.w = area * (f.p / totalP);
        leftX += f.w;
        usedArea += f.w;
      });
    }

    debugDraw.push({
      t: 'circle',
      x: cx + settings.x,
      y: ccy + settings.y,
      d: thresh,
      c: [1, 1, 0, 1],
    });
  }
  return frames;
}

var Animation = (animateIcons, pointer, settings) => {
  let _firstIcon = animateIcons[0];
  let _lastIcon = animateIcons[animateIcons.length - 1];
  let first = _firstIcon._pos || [0, 0];
  let last = _lastIcon._pos || [0, 0];

  let debugDraw = [];
  let frames = gen_frames({
    ...settings,
    pointer: [
      settings.pointer[0] - settings.x,
      settings.pointer[1] - settings.y,
    ],
    iconsCount: settings.iconsCount + 2,
    debugDraw,
  });
  let lastIdx = frames.length - 1;
  let padLeft = Math.floor(frames[0].w);
  let padRight = Math.floor(frames[lastIdx].w);
  frames = frames.filter((i) => {
    return i.idx != 0 && i.idx != lastIdx;
  });
  frames.forEach((i) => {
    debugDraw.push({
      t: 'circle',
      x: i.x + settings.x + i.w / 2,
      y: i.y + settings.y + i.w / 2,
      d: i.w,
      c: [1, 0, 0, 1],
    });
  });

  let idx = 0;
  animateIcons.forEach((a) => {
    let f = frames[idx++];
    if (f.p > 1) {
      f.p *= 0.6 * (1 + settings.animation_magnify);

      // rise
      let sz = (settings.iconSize * f.p - settings.iconSize);
      if (settings.vertical) {
        if (settings.position == 1) {
          a._pos[0] -= sz * 0.8 * settings.animation_rise;
        } else {
          a._pos[0] += sz * 0.8 * settings.animation_rise;
        }
      } else {
        a._pos[1] -= sz * 0.8 * settings.animation_rise;
      }
    }
    a._targetScale = f.p;
    a._targetSpread = f.w;
  });

  log(`${padLeft} ${padRight}`);

  return {
    first,
    last,
    padLeft,
    padRight,
    debugDraw,
  };
};
