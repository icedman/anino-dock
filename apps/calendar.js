const { Clutter, GObject, GLib, PangoCairo, Pango } = imports.gi;
const Cairo = imports.cairo;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Drawing = Me.imports.drawing.Drawing;

let size = 400;

var Calendar = GObject.registerClass(
  {},

  // todo St.DrawingArea
  class AninoCalendar extends Clutter.Actor {
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
      const { dark_color, light_color, accent_color } = this.settings;

      const bg_color = light_color;
      const day_color = dark_color;
      const date_color = accent_color;

      ctx.setOperator(Cairo.Operator.CLEAR);
      ctx.paint();

      ctx.translate(size / 2, size / 2);
      ctx.setLineWidth(1);
      ctx.setLineCap(Cairo.LineCap.ROUND);
      ctx.setOperator(Cairo.Operator.SOURCE);

      let bgSize = size * 0.7;
      let offset = size - bgSize;

      const d0 = new Date();

      Drawing.draw_rounded_rect(
        ctx,
        bg_color,
        -size / 2 + offset / 2,
        -size / 2 + offset / 2,
        bgSize,
        bgSize,
        1,
        8
      );
      Drawing.set_color(ctx, accent_color, 1.0);
      ctx.moveTo(0, 12);
      Drawing.draw_text(ctx, `${d0.getDate()}`, 'DejaVuSans 36');

      let dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      Drawing.set_color(ctx, day_color, 1.0);
      ctx.moveTo(0, -22);
      Drawing.draw_text(ctx, `${dayNames[d0.getDay()]}`, 'DejaVuSans 16');

      ctx.$dispose();
    }

    destroy() {}
  }
);
