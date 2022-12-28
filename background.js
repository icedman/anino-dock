const { St, Shell, GObject, Gio, GLib, Gtk, Meta, Clutter } = imports.gi;
const Main = imports.ui.main;
const Dash = imports.ui.dash.Dash;
const Point = imports.gi.Graphene.Point;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const DrawOverlay = Me.imports.apps.overlay.DrawOverlay;
const Drawing = Me.imports.drawing.Drawing;

function drawBackground(ctx) {
  let w = 2;

  // Drawing.draw_rect(
  //   ctx,
  //   [1, 0, 0, 1],
  //   w,
  //   w,
  //   this.width - w * 3,
  //   this.height - w * 3,
  //   w
  // );

  // Drawing.draw_rounded_rect(
  //   ctx,
  //   [1, 0, 0, 0],
  //   w,
  //   w,
  //   this.width - w * 3,
  //   this.height - w * 3,
  //   2,
  //   16
  // )
}

var DockBackground = GObject.registerClass(
  {},
  class AninoDockBackground extends St.Widget {
    _init(params) {
      super._init({
        name: 'DockBackground',
        ...(params || {}),
      });

      this.drawOverlay = new DrawOverlay(20, 20);
      this.drawOverlay.onDraw = drawBackground.bind(this.drawOverlay);
      this.add_child(this.drawOverlay);
    }

    update(params) {
      let {
        first,
        last,
        padding,
        iconSize,
        scaleFactor,
        vertical,
        position,
        panel_mode,
        dashContainer,
      } = params;

      let p1 = first.get_transformed_position();
      let p2 = last.get_transformed_position();
      if (!isNaN(p1[0]) && !isNaN(p1[1])) {
        // bottom
        this.x = p1[0] - padding;
        this.y = first._fixedPosition[1] - padding; // p1[1] - padding

        if (p2[1] > p1[1]) {
          this.y = p2[1] - padding;
        }
        let width =
          p2[0] -
          p1[0] +
          iconSize * scaleFactor * last._targetScale +
          padding * 2;
        let height = iconSize * scaleFactor + padding * 2;

        if (!isNaN(width)) {
          this.width = width;
        }
        if (!isNaN(width)) {
          this.height = height;
        }

        // vertical
        if (vertical) {
          this.x = p1[0] - padding;
          this.y = first._fixedPosition[1] - padding; // p1[1] - padding

          if (position == 'right' && p2[0] > p1[0]) {
            this.x = p2[0] - padding;
          }
          if (position == 'left' && p2[0] < p1[0]) {
            this.x = p2[0] - padding;
          }

          this.width = iconSize * scaleFactor + padding * 2;
          this.height =
            p2[1] -
            p1[1] +
            iconSize * scaleFactor * last._targetScale +
            padding * 2;

          // log(`${width} ${height}`);
        }

        if (panel_mode) {
          if (vertical) {
            this.y = dashContainer.y;
            this.height = dashContainer.height;
          } else {
            this.x = dashContainer.x;
            this.width = dashContainer.width;
          }
        }

        this.drawOverlay.resize(this.width, this.height);
        this.drawOverlay.opacity = 100;
      }
    }
  }
);
