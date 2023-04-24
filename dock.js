'use strict';

const { St, Shell, GObject, Gio, GLib, Meta, Clutter } = imports.gi;

const Main = imports.ui.main;
const Panel = imports.ui.panel.Panel;
const Dash = imports.ui.dash.Dash;
const Fav = imports.ui.appFavorites;
const Point = imports.gi.Graphene.Point;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const Animator = Me.imports.animator.Animator;
const AutoHide = Me.imports.autohide.AutoHide;
const Bounce = Me.imports.effects.easing.Bounce;
const Linear = Me.imports.effects.easing.Linear;

const EDGE_DISTANCE = 20;
const MIN_SCROLL_RESOLUTION = 4;
const MAX_SCROLL_RESOLUTION = 10;

let _preferredIconSizes = null;

var Dock = GObject.registerClass(
  {},
  class AninoDock extends St.Widget {
    _init() {
      super._init({
        name: 'aninoDock',
        // vertical: true,
        reactive: true,
        track_hover: true,
      });

      this._scrollCounter = 0;

      let pivot = new Point();
      pivot.x = 0.5;
      pivot.y = 0.5;
      this.pivot_point = pivot;

      this.animator = new Animator();
      this.animator.dashContainer = this;
      this.autohider = new AutoHide();
      this.autohider.dashContainer = this;
      this.autohider.animator = this.animator;

      // panel
      this.panel = Main.panel;
      this.panel.visible = false;

      // W: breakable
      this.panelLeft = this.panel._leftBox;
      this.panelRight = this.panel._rightBox;
      this.panelCenter = this.panel._centerBox;

      // this.separators = [{ index: 4 }, { index: 8 }];

      this.createDash();

      this.listeners = [this.animator, this.autohider];
      this.connectObject(
        'button-press-event',
        this._onButtonEvent.bind(this),
        'motion-event',
        this._onMotionEvent.bind(this),
        'enter-event',
        this._onEnterEvent.bind(this),
        'leave-event',
        this._onLeaveEvent.bind(this),
        'destroy',
        () => {},
        this
      );
    }

    createDash() {
      if (this.dash) {
        this.remove_child(this.dash);
      }
      this.dash = new Dash();
      this.dash.set_name('dash');
      this.dash.add_style_class_name('overview');
      this.dash._adjustIconSize = () => {};
      this.dash.opacity = 0;
      this.dash.visible = false;
      this.add_child(this.dash);
    }

    vfunc_scroll_event(scrollEvent) {
      this._onScrollEvent({}, scrollEvent);
      return Clutter.EVENT_PROPAGATE;
    }

    dock() {
      this.animator.enable();
    }

    undock() {
      this.restorePanel();
      this.animator.disable();
    }

    restorePanel() {
      // W: breakable
      let reparent = [
        this.panel._leftBox,
        this.panel._centerBox,
        this.panel._rightBox,
      ];
      reparent.forEach((c) => {
        if (c.get_parent()) {
          c.get_parent().remove_child(c);
        }
        this.panel.add_child(c);
      });
      this.panel.visible = true;
    }

    addToChrome() {
      if (this._onChrome) {
        return;
      }

      Main.layoutManager.addChrome(this, {
        affectsStruts: !this.extension.autohide_dash,
        // affectsStruts: true,
        affectsInputRegion: true,
        trackFullscreen: true,
      });

      this._reparentItems();
    }

    _reparentItems() {
      // todo: refactor this
      // reparent -- rearranges the z-order
      let reparent = [
        // { c: this.animator._dotsContainer, p: this, above: true },
        // { c: this.animator._iconsContainer, p: this.animator._dotsContainer },

        { c: this.animator._iconsContainer, p: this, above: true },
        { c: this.animator._dotsContainer, p: this.animator._iconsContainer },

        { c: this.animator._background, p: this.animator.dashContainer },
        { c: this.animator._dockExtension, p: this.animator._background },
        {
          c: this.animator._overlay,
          p: this.animator._iconsContainer,
          above: true,
        },
        {
          c: this.animator._dockOverlay,
          p: this,
          above: true,
        },
      ];

      reparent.forEach((obj) => {
        let { c, p, above } = obj;
        if (c && c.get_parent()) {
          c.get_parent().remove_child(c);
        }
        if (c && p) {
          if (above) {
            Main.uiGroup.insert_child_above(c, p);
          } else {
            Main.uiGroup.insert_child_below(c, p);
          }
        }
      });

      this._onChrome = true;
    }

    removeFromChrome() {
      if (!this._onChrome) {
        return;
      }

      Main.layoutManager.removeChrome(this);
      this._onChrome = false;
    }

    _onButtonEvent(obj, evt) {
      this.listeners
        .filter((l) => {
          return l._enabled;
        })
        .forEach((l) => {
          if (l._onButtonEvent) l._onButtonEvent(obj, evt);
        });
    }

    _onMotionEvent() {
      this.listeners
        .filter((l) => {
          return l._enabled;
        })
        .forEach((l) => {
          if (l._onMotionEvent) l._onMotionEvent();
        });
    }

    _onEnterEvent() {
      this.listeners
        .filter((l) => {
          return l._enabled;
        })
        .forEach((l) => {
          if (l._onEnterEvent) l._onEnterEvent();
        });

      this.layout();
    }

    _onLeaveEvent() {
      this.listeners
        .filter((l) => {
          return l._enabled;
        })
        .forEach((l) => {
          if (l._onLeaveEvent) l._onLeaveEvent();
        });
    }

    animate() {
      this._onEnterEvent();
    }

    cancelAnimations() {
      this.extension._hiTimer.cancel(this.animator._animationSeq);
      this.animator._animationSeq = null;
      this.extension._hiTimer.cancel(this.autohider._animationSeq);
      this.autohider._animationSeq = null;
    }

    _maybeMinimizeOrMaximize(app) {
      let windows = app.get_windows();
      if (!windows.length) return;

      let event = Clutter.get_current_event();
      let modifiers = event ? event.get_state() : 0;
      let pressed = event.type() == Clutter.EventType.BUTTON_PRESS;
      let button1 = (modifiers & Clutter.ModifierType.BUTTON1_MASK) != 0;
      let button2 = (modifiers & Clutter.ModifierType.BUTTON2_MASK) != 0;
      let button3 = (modifiers & Clutter.ModifierType.BUTTON3_MASK) != 0;
      let shift = (modifiers & Clutter.ModifierType.SHIFT_MASK) != 0;
      let isMiddleButton = button3; // middle?
      let isCtrlPressed = (modifiers & Clutter.ModifierType.CONTROL_MASK) != 0;
      let openNewWindow =
        app.can_open_new_window() &&
        app.state == Shell.AppState.RUNNING &&
        (isCtrlPressed || isMiddleButton);
      if (openNewWindow) return;

      let workspaceManager = global.workspace_manager;
      let activeWs = workspaceManager.get_active_workspace();
      let focusedWindow = null;

      windows.forEach((w) => {
        if (w.has_focus()) {
          focusedWindow = w;
        }
      });

      // delay - allow dash to actually call 'activate' first
      if (focusedWindow) {
        this.extension._hiTimer.runOnce(() => {
          if (shift) {
            if (focusedWindow.get_maximized() == 3) {
              focusedWindow.unmaximize(3);
            } else {
              focusedWindow.maximize(3);
            }
          } else {
            windows.forEach((w) => {
              w.minimize();
            });
          }
        }, 50);
      } else {
        this.extension._hiTimer.runOnce(() => {
          windows.forEach((w) => {
            if (w.is_hidden()) {
              w.unminimize();
              if (w.has_focus()) {
                w.raise();
              }
            }
          });
        }, 50);
      }
    }

    _findIcons() {
      if (!this.dash) return [];

      if (this.dash._showAppsIcon) {
        this.dash._showAppsIcon.visible = this.extension.apps_icon;
      }

      this._separators = [];

      // hook on showApps
      if (this.dash.showAppsButton && !this.dash.showAppsButton._checkEventId) {
        this.dash.showAppsButton._checkEventId =
          this.dash.showAppsButton.connect('notify::checked', () => {
            if (!Main.overview.visible) {
              Main.uiGroup
                .find_child_by_name('overview')
                ._controls._toggleAppsPage();
            }
          });
      }

      // W: breakable
      let icons = this.dash._box.get_children().filter((actor) => {
        if (!actor.child) {
          let cls = actor.get_style_class_name();
          if (cls === 'dash-separator') {
            actor.visible = false;
            // actor.width = (this.iconSize / 8) * (this.scaleFactor || 1);
            // actor.height = (this.iconSize / 8) * (this.scaleFactor || 1);
            this._separators.push(actor);
          }
          return false;
        }

        actor._cls = actor.get_style_class_name();

        if (actor.child._delegate && actor.child._delegate.icon) {
          // hook activate function
          if (actor.child.activate && !actor.child._activate) {
            actor.child._activate = actor.child.activate;
            actor.child.activate = () => {
              this._maybeBounce(actor);
              this._maybeMinimizeOrMaximize(actor.child.app);
              actor.child._activate();
            };
          }

          return true;
        }
        return false;
      });

      // hide running apps
      if (this.extension.favorites_only) {
        let favorites = Fav.getAppFavorites();
        let favorite_ids = favorites._getIds();
        icons = icons.filter((i) => {
          let app = i.child.app;
          let appId = app ? app.get_id() : '';
          let shouldInclude = favorite_ids.includes(appId);
          i.child.visible = shouldInclude;
          if (!shouldInclude) {
            i.width = -1;
            i.height = -1;
          }
          return shouldInclude;
        });
      }

      icons.forEach((c) => {
        // W: breakable
        let label = c.label;
        let appwell = c.first_child;
        let draggable = appwell._draggable;
        let widget = appwell.first_child;
        let icongrid = widget.first_child;
        let boxlayout = icongrid.first_child;
        let bin = boxlayout.first_child;
        let icon = bin.first_child;

        c._bin = bin;
        c._label = label;
        c._draggable = draggable;
        c._appwell = appwell;
        if (icon) {
          c._icon = icon;
        }
      });

      try {
        // W: breakable
        let appsButton = this.dash.showAppsButton;
        let appsIcon = this.dash._showAppsIcon;
        if (appsButton && appsIcon) {
          let apps = appsButton.get_parent();
          let widget = appsIcon.child;
          if (widget && widget.width > 0 && widget.get_parent().visible) {
            let icongrid = widget.first_child;
            let boxlayout = icongrid.first_child;
            let bin = boxlayout.first_child;
            let icon = bin.first_child;
            let c = apps;
            c._bin = bin;
            c._icon = icon;
            c._label = widget._delegate.label;
            c._showApps = appsButton;
            // make virtually unclickable
            appsButton.reactive = false;
            // appsButton.width = 1;
            // appsButton.height = 1;
            icons.push(c);
          }
        }
      } catch (err) {
        // could happen if ShowApps is hidden or not yet created?
      }

      this._icons = icons;
      icons.forEach((icon) => {
        if (!icon._destroyConnectId) {
          icon._destroyConnectId = icon.connect('destroy', () => {
            this.animator._previousFind = null;
          });
        }
      });

      // reposition apps icon
      // W: breakable
      let p = this.dash._box.get_parent();
      if (this.extension.apps_icon_start && p.first_child == this.dash._box) {
        p.remove_child(this.dash._box);
        p.add_child(this.dash._box);
      } else if (
        !this.extension.apps_icon_start &&
        p.first_child != this.dash._box
      ) {
        // reverted to original position at end, when the dash is recreated via settings change event
      }

      return icons;
    }

    layout(disable) {
      if (disable) return;

      let {
        dock_location,
        icon_size,
        edge_distance,
        panel_mode,
        shrink_icons,
        animation_spread,
        animation_magnify,
      } = this.extension;

      this.extension._queryDisplay();

      let pos = dock_location || 0;

      this.extension._position = ['bottom', 'left', 'right', 'top'][pos];
      this.extension._vertical =
        this.extension._position == 'left' ||
        this.extension._position == 'right';
      this._position = this.extension._position;

      let scaleFactor = this._monitor.geometry_scale;

      let iconSize = 64;
      if (!_preferredIconSizes) {
        _preferredIconSizes = [32];
        for (let i = 16; i < 128; i += 4) {
          _preferredIconSizes.push(i);
        }
      }
      iconSize =
        2 *
        (_preferredIconSizes[
          Math.floor(icon_size * _preferredIconSizes.length)
        ] || 64);
      iconSize *= this.extension.scale;
      this.iconSize = iconSize;

      this._edge_distance = (edge_distance || 0) * EDGE_DISTANCE * scaleFactor;

      let distance = panel_mode ? 0 : this._edge_distance;
      let dockPadding = iconSize * 0.1;
      if (panel_mode) {
        distance -= 8;
      }

      // scale down icons to fit monitor
      this._scaleDownExcess = 0;
      if (this._icons) {
        let iconSpacing = iconSize * (1.2 + animation_spread / 4);
        let limit = this.extension._vertical ? 0.96 : 0.98;

        if (
          this.extension.dock_size_limit >= 0.5 &&
          this.extension.dock_size_limit <= 1.0
        ) {
          limit *= this.extension.dock_size_limit;
        }

        let scaleDown = 1.0;
        let maxWidth =
          (this.extension._vertical
            ? this._monitor.height
            : this._monitor.width) * limit;
        let projectedWidth = iconSpacing * scaleFactor * this._icons.length;
        let iconSizeScaledUp =
          iconSize + iconSize * animation_magnify * scaleFactor;
        projectedWidth += iconSizeScaledUp * 4 - iconSize * scaleFactor * 4;
        if (projectedWidth > maxWidth * 0.98) {
          scaleDown =
            (maxWidth - (iconSize / 2) * scaleFactor) / projectedWidth;
        }
        iconSize *= scaleDown;
        dockPadding *= scaleDown;
        distance *= scaleDown;
        let scaleDownWidth = projectedWidth * scaleDown;
        let diff = projectedWidth - scaleDownWidth;
        this._scaleDownExcess = diff;
        this._projectedWidth = scaleDownWidth;
      }
      this.extension._effective_edge_distance = distance;

      let scale = 0.5 + this.extension.scale / 2;
      let dashHeight = iconSize * (shrink_icons ? 1.8 : 1.6) * scale;
      let dockHeight =
        (iconSize + dockPadding) * (shrink_icons ? 1.8 : 1.6) * scale;
      dockHeight += this.extension._effective_edge_distance;
      this.iconSize = iconSize;

      this.dash.visible = true;

      // check should disable hide
      this._disableAutohide = false;
      {
        let display = global.display;
        switch (this._position) {
          // left
          case 'left':
            this._disableAutohide =
              display.get_monitor_neighbor_index(
                this._monitorIndex,
                Meta.DisplayDirection.LEFT
              ) != -1;
            break;
          // right
          case 'right':
            this._disableAutohide =
              display.get_monitor_neighbor_index(
                this._monitorIndex,
                Meta.DisplayDirection.RIGHT
              ) != -1;
            break;
          // bottom
          case 'bottom':
          default:
            this._disableAutohide =
              display.get_monitor_neighbor_index(
                this._monitorIndex,
                Meta.DisplayDirection.DOWN
              ) != -1;
            break;
        }
      }

      if (this.extension._vertical) {
        let sh = this._monitor.height;
        // left/right
        this.set_size(
          dockHeight * scaleFactor,
          sh - (this._monitorIsPrimary ? Main.panel.height : 0)
        );
        this.dash.last_child.layout_manager.orientation = 1;
        this.dash._box.layout_manager.orientation = 1;
        this.dash.height = -1;
        this.dash.width = dockHeight * scaleFactor;
        this.dash.add_style_class_name('vertical');
      } else {
        let sw = this._monitor.width;
        // top/bottom
        this.set_size(sw, dockHeight * scaleFactor);
        this.dash.last_child.layout_manager.orientation = 0;
        this.dash._box.layout_manager.orientation = 0;
        this.dash.height = dockHeight * scaleFactor;
        this.dash.width = -2;
        this.dash.remove_style_class_name('vertical');
      }

      if (this.autohider._enabled && !this.autohider._shown) {
        // remain hidden
      } else {
        if (this.extension._vertical) {
          // left
          this.set_position(
            this._monitor.x,
            this._monitor.y + (this._monitorIsPrimary ? Main.panel.height : 0)
          );
          // right
          if (this._position == 'right') {
            this.x += this._monitor.width;
            this.x -= dockHeight * scaleFactor;
          }

          this.dash.x = 0;
        } else {
          // top/bottom
          this.set_position(
            this._monitor.x + 1,
            this._monitor.y + this._monitor.height - dockHeight * scaleFactor
          );

          this.dash.y = 0;
        }

        this._fixedPosition = [this.x, this.y];

        this._hidePosition = [...this._fixedPosition];

        let hidePad = 4 * scaleFactor;
        if (this.extension._vertical) {
          this._hidePosition[0] =
            this._monitor.x - dockHeight * scaleFactor + hidePad;

          // right
          if (this._position == 'right') {
            this._hidePosition[0] =
              this._monitor.x + this._monitor.width - hidePad;
          }
        } else {
          this._hidePosition[1] =
            this._monitor.y + this._monitor.height - hidePad;
        }

        this._dockHeight = dockHeight * scaleFactor;
        this._dockPadding = dockPadding * scaleFactor;
        this._dashHeight = dashHeight * scaleFactor;
      }
    }

    _maybeBounce(container) {
      if (!this.extension.open_app_animation) {
        return;
      }
      if (container.child.app && !container.child.app.get_n_windows()) {
        if (container._renderedIcon) {
          this._bounceIcon(container._renderedIcon);
        }
      }
    }

    // todo move to animator
    _bounceIcon(icon) {
      if (!icon) {
        icon = this.animator._iconsContainer.get_children()[0];
      }

      let scaleFactor = this._monitor.geometry_scale;
      let travel =
        (this.iconSize / 3) *
        ((0.1 + this.extension.animation_rise) * 1.5) *
        scaleFactor;
      icon._img.translation_y = 0;

      // overlay images such as clocks & calendars, bounce them too
      let attached = icon.last_child;

      let t = 250;
      let _frames = [
        {
          _duration: t,
          _func: (f, s) => {
            let res = Linear.easeNone(f._time, 0, travel, f._duration);
            icon._img.translation_y = -res;
            attached.translation_y = icon._img.translation_y;
          },
        },
        {
          _duration: t * 3,
          _func: (f, s) => {
            let res = Bounce.easeOut(f._time, travel, -travel, f._duration);
            icon._img.translation_y = -res;
            attached.translation_y = icon._img.translation_y;
          },
        },
      ];

      let frames = [];
      for (let i = 0; i < 3; i++) {
        _frames.forEach((b) => {
          frames.push({
            ...b,
          });
        });
      }

      this.extension._hiTimer.runAnimation([
        ...frames,
        {
          _duration: 10,
          _func: (f, s) => {
            icon._img.translation_y = 0;
            attached.translation_y = icon._img.translation_y;
          },
        },
      ]);
    }

    _lockCycle() {
      if (this._lockedCycle) return;
      this._lockedCycle = true;
      this.extension._hiTimer.runOnce(() => {
        this._lockedCycle = false;
      }, 500);
    }

    _cycleWindows(app, evt) {
      if (this._lockedCycle) {
        this._scrollCounter = 0;
        return false;
      }

      let focusId = 0;
      let workspaceManager = global.workspace_manager;
      let activeWs = workspaceManager.get_active_workspace();

      let windows = app.get_windows();

      if (evt.modifier_state & Clutter.ModifierType.CONTROL_MASK) {
        windows = windows.filter((w) => {
          return activeWs == w.get_workspace();
        });
      }

      let nw = windows.length;
      windows.sort((w1, w2) => {
        return w1.get_id() > w2.get_id() ? -1 : 1;
      });

      if (nw > 1) {
        for (let i = 0; i < nw; i++) {
          if (windows[i].has_focus()) {
            focusId = i;
          }
          if (windows[i].is_hidden()) {
            windows[i].unminimize();
            windows[i].raise();
          }
        }

        let current_focus = focusId;

        if (this._scrollCounter < -1 || this._scrollCounter > 1) {
          focusId += Math.round(this._scrollCounter);
          if (focusId < 0) {
            focusId = nw - 1;
          }
          if (focusId >= nw) {
            focusId = 0;
          }
          this._scrollCounter = 0;
        }

        if (current_focus == focusId) return;
      }

      let window = windows[focusId];

      // log(`${focusId}/${window.get_id()}`);

      if (window) {
        if (activeWs == window.get_workspace()) {
          window.raise();
          window.focus(0);
        } else {
          activeWs.activate_with_focus(window, global.get_current_time());
        }
      }
    }

    _onScrollEvent(obj, evt) {
      this.listeners
        .filter((l) => {
          return l._enabled;
        })
        .forEach((l) => {
          if (l._onScrollEvent) l._onScrollEvent(obj, evt);
        });

      this._lastScrollEvent = evt;
      let pointer = global.get_pointer();
      if (this._nearestIcon) {
        let icon = this._nearestIcon;
        // log(`scroll - (${icon._pos}) (${pointer})`);
        let SCROLL_RESOLUTION =
          MIN_SCROLL_RESOLUTION +
          MAX_SCROLL_RESOLUTION -
          (MAX_SCROLL_RESOLUTION * this.extension.scroll_sensitivity || 0);
        if (icon._appwell && icon._appwell.app) {
          this._lastScrollObject = icon;
          switch (evt.direction) {
            case Clutter.ScrollDirection.UP:
            case Clutter.ScrollDirection.LEFT:
              this._scrollCounter += 1 / SCROLL_RESOLUTION;
              break;
            case Clutter.ScrollDirection.DOWN:
            case Clutter.ScrollDirection.RIGHT:
              this._scrollCounter -= 1 / SCROLL_RESOLUTION;
              break;
          }
          this._cycleWindows(icon._appwell.app, evt);
        }
      }
    }
  }
);
