// adapted from gnome-shell-cairo clock extension

const { Clutter, GObject, GLib, PangoCairo, Pango } = imports.gi;
const Cairo = imports.cairo;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Drawing = Me.imports.drawing.Drawing;

let size = 400;

function DrawClock1(ctx, date, x, y, size, settings) {
  const { dark_color, light_color, accent_color } = settings;

  let bgSize = size * 0.84;

  const d0 = date;
  let h0 = d0.getHours();
  const m0 = d0.getMinutes();

  ctx.save();
  ctx.translate(x, y);
  Drawing.draw_circle(ctx, dark_color, 0, 0, bgSize);
  ctx.moveTo(0, 0);
  Drawing.draw_rotated_line(
    ctx,
    light_color,
    size / 20,
    (h0 * 30 + (m0 * 30) / 60) * (Math.PI / 180),
    -Math.floor(size / 3.7)
  );
  Drawing.draw_rotated_line(
    ctx,
    accent_color,
    size / 33,
    m0 * 6 * (Math.PI / 180),
    -Math.floor(size / 2.7)
  );
  ctx.restore();
}

var Clock = GObject.registerClass(
  {},
  // todo St.DrawingArea
  class AninoClock extends Clutter.Actor {
    _init(x) {
      super._init();

      if (x) size = x;

      this.settings = {
        dark_color: [0.2, 0.2, 0.2, 1.0],
        light_color: [1.0, 1.0, 1.0, 1.0],
        accent_color: [1.0, 0.0, 0.0, 1.0],
      };

      this._canvas = new Clutter.Canvas();
      this._canvas.connect('draw', this.on_draw.bind(this));
      this._canvas.invalidate();
      this._canvas.set_size(size, size);
      this.set_size(size, size);
      this.set_content(this._canvas);
      this.reactive = false;
    }

    redraw() {
      this._canvas.invalidate();
    }

    on_draw(canvas, ctx, width, height) {
      ctx.setOperator(Cairo.Operator.CLEAR);
      ctx.paint();

      ctx.translate(size / 2, size / 2);
      ctx.setLineWidth(1);
      ctx.setLineCap(Cairo.LineCap.ROUND);
      ctx.setOperator(Cairo.Operator.SOURCE);

      DrawClock1(ctx, new Date(), 0, 0, size, {
        ...this.settings,
      });

      ctx.$dispose();
    }

    destroy() {}
  }
);
