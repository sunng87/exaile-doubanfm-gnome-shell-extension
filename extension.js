const DBus = imports.dbus
const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const _ = imports.gettext.gettext;

const ExaileDoubanFMButton = function   () {
  this.on = false;
  this.proxy = new DoubanFMProxy(this);
  this._init();
};

ExaileDoubanFMButton.prototype = {
  __proto__: PanelMenu.Button.prototype,

  _init: function() {
    PanelMenu.Button.prototype._init.call(this, 0.0);
    this._label = new St.Label({ style_class: 'panel-label', text: _("DoubanFM") });
    this.actor.add_actor(this._label);
    this.actor.hide();

    this.cover = new St.Bin({});
    this.menu.addActor(this.cover);

    this._labels = new PopupMenu.PopupMenuItem(_('Stopped'), {reactive: false});
    this.menu.addMenuItem(this._labels);

    this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this._favorite = new PopupMenu.PopupMenuItem(_('Favorite'));
    this._favorite.connect('activate', Lang.bind(this, this._onFavClicked));
    this.menu.addMenuItem(this._favorite);
    
    this._skip = new PopupMenu.PopupMenuItem(_('Skip'));
    this._skip.connect('activate', Lang.bind(this, this._onSkipClicked));
    this.menu.addMenuItem(this._skip);

    this._delete = new PopupMenu.PopupMenuItem(_('Delete'));
    this._delete.connect('activate', Lang.bind(this, this._onDeleteClicked));
    this.menu.addMenuItem(this._delete);


  },

  _onDestroy: function() {},

  _onFavClicked: function(){
    this.proxy.ToggleFavoriteRemote(function(){})
    this.fav = !this.fav;
    if (this.fav) {
      global.log('fav');
      this._favorite.label.add_style_class_name('red');
      //this._favorite.label.style_class = 'red';
      global.log('fav2');
    } else {
      this._favorite.label.remove_style_class_name('red');
      //this._favorite.label.style_class = null;
    }
  },

  _onSkipClicked: function() {
    this.proxy.SkipRemote(function(){});
  },

  _onDeleteClicked: function() {
    this.proxy.DeleteRemote(function(){});
  },

  setCurrentPlaying: function(title, artist, channel, album_art, fav){
    html = "Current Playing...\n<b><big>%s</big></b>\n%s\n%s".format(title, artist, channel);
    this._labels.label.clutter_text.set_markup(html);

    textureCache = St.TextureCache.get_default();
    this.cover.set_child(
      textureCache.load_uri_async(album_art, 120, 120));

    //this._labels.label.clutter_text.markup = html
    if(fav == "1") {
      this.fav = true;
      this._favorite.label.add_style_class_name('red');
    } else {
      this.fav = false;
      this._favorite.label.remove_style_class_name('red');
    }
  },

  setAsStopped: function() {
    this._labels.label.text = "Stopped";
  },

  show: function() {
    if (!this.on){
      this.on = true;
      this.actor.show();
    }
  },

  hide: function() {
    if (this.on){
      this.on = false;
      this.actor.hide();
    }
  },

  enable: function() {
    Main.panel._addToPanelBox('douban-fm', this, -1, Main.panel._leftBox);
    Main.panel.menuManager.addMenu(this.menu);
    this.proxy.open();
  },

  disable: function() {
    Main.panel.menuManager.removeMenu(this.menu);
    Main.panel._leftBox.remove_actor(this.actor);
    this.proxy.close();
  }
};

function DoubanFMProxy(ui) {
  this._init();
  this.ui = ui;
  this.dbus_id = null;
}

DoubanFMProxy.prototype = {
  _init: function() {
    DBus.session.proxifyObject (this,
				'info.sunng.ExaileDoubanfm.instance',
				'/info/sunng/ExaileDoubanfm');
  },
  open: function() {
    let self = this;
    this.dbus_id = this.connect('StatusChanged', function(dummy, data){
      let status  = data['Status'];
      if (status == 'Playing') {
        self.ui.show()
        let metadata = data['Metadata'];

        title = metadata['title'];
        artist = metadata['artist'];
        channel_name = metadata['channel_name'];
        fav = metadata['like']
        album_art = metadata['cover_url']

        self.ui.fav = (fav == '1')
        self.ui.setCurrentPlaying(title, artist, channel_name, album_art, fav)
      } else if (status == 'Stop') {
        self.ui.setAsStopped();
      } else if (status == 'Init') {
        self.ui.show();
      } else if (status == 'Exit') {
        self.ui.setAsStopped();
        self.ui.hide();
      }
    });
  },
  close: function() {
    if (this.dbus_id) {
      this.disconnect(this.dbus_id);
    }
  }
}
DBus.proxifyPrototype (DoubanFMProxy.prototype, 
                       {
                         name: 'info.sunng.ExaileDoubanfm',
                         methods: [
                           {name: 'ToggleFavorite', inSignature: ''},
                           {name: 'Skip', inSignature: ''},
                           {name: 'Delete', inSignature: ''},
                         ],
                         signals: [
                           {name: 'StatusChanged', inSignature: 'sa{sv}as'}
                         ],
                       });



function init() {
  return new ExaileDoubanFMButton();
}

