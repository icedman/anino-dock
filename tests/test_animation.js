#!/usr/bin/gjs

const Cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const GtkClutter = imports.gi.GtkClutter;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const iconsCountTest = 10;

// Get application folder and add it into the imports path
function getAppFileInfo() {
  let stack = new Error().stack,
    stackLine = stack.split('\n')[1],
    coincidence,
    path,
    file;

  if (!stackLine) throw new Error('Could not find current file (1)');

  coincidence = new RegExp('@(.+):\\d+').exec(stackLine);
  if (!coincidence) throw new Error('Could not find current file (2)');

  path = coincidence[1];
  file = Gio.File.new_for_path(path);
  return [file.get_path(), file.get_parent().get_path(), file.get_basename()];
}
const path = getAppFileInfo()[1];
imports.searchPath.push(path);
imports.searchPath.push(path + '/../');

const Drawing = imports.drawing;

const App = function () {
  this.title = 'Example Cairo';
  GLib.set_prgname(this.title);
};

App.prototype.run = function (ARGV) {
  this.application = new Gtk.Application();
  this.application.connect('activate', () => {
    this.onActivate();
  });
  this.application.connect('startup', () => {
    this.onStartup();
  });
  this.application.run([]);
};

App.prototype.onActivate = function () {
  this.window.show_all();
};

App.prototype.onStartup = function () {
  this.initClutter();
  this.buildUI();
};

App.prototype.initClutter = function () {
  GtkClutter.init(null);
  Clutter.init(null);
};

App.prototype.buildUI = function () {
  this.window = new Gtk.ApplicationWindow({
    application: this.application,
    title: this.title,
    default_height: 300,
    default_width: 500,
    window_position: Gtk.WindowPosition.CENTER,
  });
  try {
    this.window.set_icon_from_file(path + '/assets/appIcon.png');
  } catch (err) {
    this.window.set_icon_name('application-x-executable');
  }

  this.color = [1, 0, 0, 1];
  this.content = this.buildBody();
  this.window.add(this.content);
};

App.prototype.buildBody = function () {
  let area = new Gtk.DrawingArea();
  area.set_size_request(1200, 600);
  area.connect('draw', (area, ctx) => {
    this.draw(area, ctx);
  });

  area.add_events(Gdk.EventMask.POINTER_MOTION_MASK);
  area.connect('motion-notify-event', (obj, evt) => {
    this.coords = evt.get_coords();
    area.queue_draw();
  });
  return area;
};

function gen_frames(settings) {
  let { iconsCount, iconSize, iconSpacing, pointer, width, height } = settings;

  let frames = [];
  for (let i = 0; i < iconsCount; i++) {
    frames.push({
      idx: i,
      x: 0,
      y: 0,
      w: iconSpacing,
      h: iconSpacing,
      l: iconSpacing,
      r: 0,
      p: 1,
    });
  }

  function total_length() {
    let tl = 0;
    frames.forEach((f) => {
      tl += f.l;
    });
    return tl;
  }

  function reposition() {
    let tl = total_length();
    let r1 = width / 2 - tl / 2;
    frames.forEach((f) => {
      f.r = r1;
      r1 += f.l;
    });
  }

  reposition();

  if (pointer) {
    let left = [];
    let center = [];
    let right = [];

    let thresh = iconSpacing * 3;
    let thresh2 = thresh / 2;
    let cx = pointer[1];
    let cy = pointer[2];

    let doLeft = true;
    let doRight = false;
    let totalP = 0;

    frames.forEach((f) => {
      let ir = f.r + f.l / 2;
      let dr = ir - cx;
      dr = Math.sqrt(dr * dr);
      f.p = 1;
      if (dr < thresh2) {
        f.in = true;
        let p = 1 - dr / thresh2;
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
      let tw = (iconsCount + 1) * iconSpacing;
      let r1 = width / 2 - tw / 2;
      let leftX = r1;
      left.forEach((f) => {
        f.r = r1;
        r1 += f.l;
        leftX = r1;
      });
      r1 = width / 2 + tw / 2 - right.length * iconSpacing;
      right.forEach((f) => {
        f.r = r1;
        r1 += f.l;
      });
      let rightX =
        leftX + (iconsCount - left.length - right.length + 1) * iconSpacing;
      let area = rightX - leftX;
      // Drawing.draw_line(ctx, [1, 0, 0, 1], 1, leftX, ccy, rightX, ccy);

      let usedArea = 0;
      center.forEach((f) => {
        f.r = leftX;
        f.l = area * (f.p / totalP);
        leftX += f.l;
        usedArea += f.l;
      });

      let diff = area - usedArea;
      center[0].l += diff;
    }
  }

  // commit

  frames.forEach((f) => {
    f.x = f.r;
    f.w = f.l;
  });

  return frames;
}

function _gen_frames(settings) {
  let { iconsCount, iconSize, iconSpacing, pointer, width, height } = settings;

  let frames = [];
  for (let i = 0; i < iconsCount; i++) {
    frames.push({
      idx: i,
      x: 0,
      y: 0,
      w: iconSpacing,
      h: iconSpacing,
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

    let thresh = iconSpacing * 3;
    let thresh2 = thresh / 2;
    let cx = pointer[1];
    let cy = pointer[2];
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
      if (dx < thresh2 && dy < iconSpacing) {
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
      let tw = (iconsCount + 1) * iconSpacing;
      let x1 = width / 2 - tw / 2;
      let leftX = x1;
      left.forEach((f) => {
        f.x = x1;
        x1 += f.w;
        leftX = x1;
      });
      x1 = width / 2 + tw / 2 - right.length * iconSpacing;
      right.forEach((f) => {
        f.x = x1;
        x1 += f.w;
      });
      let rightX =
        leftX + (iconsCount - left.length - right.length + 1) * iconSpacing;
      let area = rightX - leftX;
      // Drawing.draw_line(ctx, [1, 0, 0, 1], 1, leftX, ccy, rightX, ccy);

      center.forEach((f) => {
        f.x = leftX;
        f.w = area * (f.p / totalP);
        leftX += f.w;
      });
    }

    // Drawing.draw_circle(ctx, [1, 1, 0, 1], cx, ccy, thresh, 1);
  }

  return frames;
}

App.prototype.draw = function (area, ctx) {
  let height, width;
  height = area.get_allocated_height();
  width = area.get_allocated_width();

  ctx.save();

  // background
  Drawing.set_color(ctx, [0.75, 0.75, 0.75], 1);
  ctx.paint();

  let iconsCount = iconsCountTest;
  let iconSize = 32 * 2;
  let iconSpacing = iconSize * 1.4;
  let pointer = this.coords;

  let frames = gen_frames({
    iconsCount,
    iconSize,
    iconSpacing,
    pointer,
    width,
    height,
  });

  frames.forEach((f) => {
    if (f.idx == 0 || f.idx == frames.length - 1) return;
    ctx.save();
    ctx.translate(f.x + f.w / 2, f.y + iconSpacing);
    ctx.scale(f.p, f.p);
    Drawing.draw_rect(
      ctx,
      f.in ? [1, 0, 1, 1] : [1, 0, 0, 1],
      -iconSize / 2,
      -iconSize - (iconSpacing - iconSize) / 2,
      iconSize,
      iconSize,
      1
    );
    ctx.restore();
    Drawing.draw_rect(ctx, [1, 0, 1, 1], f.x, f.y, f.w, iconSpacing, 1);
  });

  Drawing.draw_rect(ctx, [1, 0, 0, 1], 8, 8, iconSpacing, iconSpacing, 1);
  Drawing.draw_line(ctx, [1, 1, 0, 1], 1, 0, 0, width, height);

  ctx.restore();
};

//Run the application
let app = new App();
app.run(ARGV);
