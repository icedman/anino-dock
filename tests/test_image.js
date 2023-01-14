#!/usr/bin/gjs

const cairo = imports.cairo;
const Clutter = imports.gi.Clutter;
const GtkClutter = imports.gi.GtkClutter;
const Gdk = imports.gi.Gdk;
const Gio = imports.gi.Gio;
const GLib = imports.gi.GLib;
const Gtk = imports.gi.Gtk;
const GdkPixbuf = imports.gi.GdkPixbuf;

Gtk.init(null);
GtkClutter.init(null);

const window = new Gtk.Window(),
  clutterEmbed = new GtkClutter.Embed(),
  actor = new Clutter.Actor({ x: 0, y: 0, width: 700, height: 400 }),
  canvas = new Clutter.Canvas({ width: 700, height: 400 });

canvas.connect('draw', function (canvas, context) {
  let PixBuffer = GdkPixbuf.Pixbuf.new_from_file(
    './tests/visual-studio-code.png'
  ); //-- Your Path
  Gdk.cairo_set_source_pixbuf(context, PixBuffer, 0, 0);
  context.paint();
});

canvas.invalidate(); //-- to fire canvas draw signal
actor.set_content(canvas); //-- canvas -> actor content
clutterEmbed.get_stage().add_child(actor); //-- actor child of embed stage
window.add(clutterEmbed); //-- embed child of window
window.set_title('Canvas Example');
window.connect('destroy', () => {
  Gtk.main_quit();
});
window.set_size_request(800, 500);
window.show_all();
Gtk.main();
