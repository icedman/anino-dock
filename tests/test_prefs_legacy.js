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
  'self-test': {
    widget_type: 'button',
  },
});

Gtk.init();

let app = new Gtk.Application({
  application_id: 'com.anino-dock.legacy.GtkApplication',
});

app.connect('activate', (me) => {
  m = new Gtk.ApplicationWindow({ application: me });
  m.set_default_size(600, 250);
  m.set_title('Prefs Test');

  let iconTheme = Gtk.IconTheme.get_for_display(Gdk.Display.get_default());
  iconTheme.add_search_path('ui/icons');

  w = new Gtk.Window();
  notebook = new Gtk.Notebook();
  w.set_child(notebook);
  w.set_size_request(600, 600);

  let builder = new Gtk.Builder();
  builder.add_from_file(`ui/legacy/general.ui`);
  builder.add_from_file(`ui/legacy/appearance.ui`);
  builder.add_from_file(`ui/legacy/tweaks.ui`);
  builder.add_from_file(`ui/legacy/others.ui`);
  notebook.append_page(
    builder.get_object('general'),
    new Gtk.Label({ label: 'General' })
  );
  notebook.append_page(
    builder.get_object('appearance'),
    new Gtk.Label({ label: 'Appearance' })
  );
  notebook.append_page(
    builder.get_object('tweaks'),
    new Gtk.Label({ label: 'Tweaks' })
  );
  notebook.append_page(
    builder.get_object('others'),
    new Gtk.Label({ label: 'Others' })
  );

  prefKeys.connectBuilder(builder);
  prefKeys.getKey('self-test').callback = () => {
    print('add');
  };
  prefKeys.callback = (obj, item) => {
    print(obj);
  };

  w.title = 'main';
  w.connect('close_request', () => {
    m.close();
    app.quit();
  });
  w.show();

  // m.present();
});

app.connect('startup', () => {});

app.run(['xx']);
