#!/usr/bin/gjs

const { Adw, Gdk, Gio, GLib, GObject, Gtk, Pango } = imports.gi;

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

const prefKeys = new imports.preferences.prefKeys.PrefKeys();

prefKeys.setKeys({
  'experimental-features': {
    default_value: false,
    widget_type: 'switch',
  },
  'animation-fps': {
    default_value: 0,
    widget_type: 'dropdown',
    key_maps: {},
  },
  'running-indicator-color': {
    default_value: [1, 1, 1, 1],
    widget_type: 'color',
    key_maps: {},
  },
  'test-row': {
    default_value: [],
    widget_type: 'json_array',
    template: 'separator-row',
  },
});

let app = new Adw.Application({
  application_id: 'com.anino-dock.GtkApplication',
});

app.connect('activate', (me) => {
  m = new Gtk.ApplicationWindow({ application: me });
  m.set_default_size(600, 250);
  m.set_title('Prefs Test');

  let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
  iconTheme.add_search_path('ui/icons');

  w = new Adw.PreferencesWindow();
  // w.add(new Adw.PreferencesPage());

  let builder = new Gtk.Builder();
  builder.add_from_file(`ui/general.ui`);
  builder.add_from_file(`ui/appearance.ui`);
  builder.add_from_file(`ui/tweaks.ui`);
  builder.add_from_file(`ui/menu.ui`);
  builder.add_from_file(`ui/others.ui`);
  w.add(builder.get_object('general'));
  w.add(builder.get_object('appearance'));
  w.add(builder.get_object('tweaks'));
  w.add(builder.get_object('others'));

  let menu_util = builder.get_object('menu_util');
  w.add(menu_util);
  w.title = 'Anino Dock';

  const page = builder.get_object('menu_util');
  const pages_stack = page.get_parent(); // AdwViewStack
  const content_stack = pages_stack.get_parent().get_parent(); // GtkStack
  const preferences = content_stack.get_parent(); // GtkBox
  const headerbar = preferences.get_first_child(); // AdwHeaderBar
  headerbar.pack_start(builder.get_object('info_menu'));

  // setup menu actions
  const actionGroup = new Gio.SimpleActionGroup();
  w.insert_action_group('prefs', actionGroup);

  // a list of actions with their associated link
  const actions = [
    {
      name: 'open-bug-report',
      link: 'https://github.com/icedman/anino-dock/issues',
    },
    {
      name: 'open-readme',
      link: 'https://github.com/icedman/anino-dock',
    },
    {
      name: 'open-license',
      link: 'https://github.com/icedman/anino-dock/blob/master/LICENSE',
    },
  ];

  actions.forEach((action) => {
    let act = new Gio.SimpleAction({ name: action.name });
    act.connect('activate', (_) =>
      Gtk.show_uri(w, action.link, Gdk.CURRENT_TIME)
    );
    actionGroup.add_action(act);
  });

  w.remove(menu_util);

  prefKeys.connectBuilder(builder);
  // prefKeys.getKey('running-indicator-color').callback = () => {
  // prefKeys.reset('brightness_scale');
  // print(prefKeys.getValue('running-indicator-color'));
  // print('reset');
  // };
  prefKeys.getKey('experimental-features').callback = (v) => {
    print(`experimental ${v}`);
  };
  if (builder.get_object('static-animation'))
    builder.get_object('static-animation').connect('clicked', () => {
      print('zero');
    });
  if (builder.get_object('self-test'))
    builder.get_object('self-test').connect('clicked', () => {
      print('self-testing...');
    });

  if (builder.get_object('test-row-add')) {
    builder.get_object('test-row-add').connect('clicked', () => {
      let k = prefKeys.getKey('test-row');
      let v = k.value || [];

      let newItem = {};
      v.push(newItem);
      prefKeys.setValue('test-row', v);
      v = k.value;

      let val = newItem;
      let container = builder.get_object('test-row-container');

      // get template
      let rowBuilder = new Gtk.Builder();
      rowBuilder.add_from_file(`ui/${k.template}.ui`);
      let row = rowBuilder.get_object('template');
      let row_remove = rowBuilder.get_object('remove');
      row.value = val;

      row_remove.connect('clicked', () => {
        let k = prefKeys.getKey('test-row');
        let v = k.value;
        let idx = v.findIndex((s) => s === row.value);
        if (idx != -1) {
          if (v.length == 1) {
            v = [];
          } else {
            v = [...v.slice(0, idx), ...v.slice(idx + 1)];
          }
          prefKeys.setValue('test-row', v);
          container.remove(row);
        }
      });

      container.add(row);
    });
  }

  w.connect('close_request', () => {
    m.close();
    app.quit();
  });

  w.show();

  // m.present();
});

app.connect('startup', () => {});

app.run(['xx']);
