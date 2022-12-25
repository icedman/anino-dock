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

  this.color = [1,0,0,1];
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

  let frames = [];
  for (let i = 0; i < iconsCount; i++) {
    frames.push({
      idx: i,
      x: 0,
      y: 0,
      w: iconSpacing,
      h: iconSpacing,
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
    let x1 = width/2 - tw/2;
    let y1 = height - iconSpacing - 8;
    frames.forEach((f) => {
      f.x = x1;
      f.y = y1;
      x1 += f.w;
    });
  }

  reposition();

  if (this.coords) {
    let targetWidth = iconSpacing * iconsCount + 2;

    let thresh = (iconSpacing * 3);
    let thresh2 = thresh / 2;
    let cx = this.coords[1];
    let cy = this.coords[2];
    let ccy = 0;
    let inCount = 0;
    frames.forEach((f) => {
      let ix = f.x + f.w/2;
      let iy = f.y + f.h/2;
      ccy = iy;
      let dx = ix - cx;
      dx = Math.sqrt(dx * dx);
      let dy = iy - cy;
      dy = Math.sqrt(dy * dy);
      if (dx < thresh2 && dy < iconSpacing) {
        f.in = true;
        let p = 1 - (dx / thresh2);
        f.w *= 1 + p;
      }
    });

    reposition();

    Drawing.draw_circle(ctx, [1, 1, 0, 1], cx, ccy, thresh, 1);
  }

  frames.forEach((f) => {
    // if (f.idx == 0 || f.idx == frames.length - 1) return;
    Drawing.draw_rect(ctx,
      f.in ? [1, 0, 1, 1] : [1, 0, 0, 1],
      f.x + f.w/2 - iconSize/2,
      f.y + iconSpacing/2 - iconSize/2, iconSize, iconSize, 1);
    Drawing.draw_rect(ctx,
      [1, 0, 1, 1],
      f.x,
      f.y, f.w, iconSpacing, 1);
  });

  Drawing.draw_rect(ctx, [1, 0, 0, 1], 8, 8, iconSpacing, iconSpacing, 1);
  Drawing.draw_line(ctx, [1, 1, 0, 1], 1, 0, 0, width, height);

  ctx.restore();
};

//Run the application
let app = new App();
app.run(ARGV);
