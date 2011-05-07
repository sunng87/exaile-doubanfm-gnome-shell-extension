const DBus = imports.dbus
const St = imports.gi.St;
const Main = imports.ui.main;
const Lang = imports.lang;
const PopupMenu = imports.ui.popupMenu;
const PanelMenu = imports.ui.panelMenu;
const _ = imports.gettext.gettext;


function _myButton(proxy) {
    this._init();
    this.proxy = proxy;
    this.proxy.ui = this;
}

_myButton.prototype = {
    __proto__: PanelMenu.Button.prototype,

    _init: function() {
        PanelMenu.Button.prototype._init.call(this, 0.0);
        this._label = new St.Label({ style_class: 'panel-label', text: _("DoubanFM") });
        this.actor.set_child(this._label);

        this._labels = new PopupMenu.PopupMenuItem(_('Stopped'));
        this.menu.addMenuItem(this._labels);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        this._favorite = new PopupMenu.PopupMenuItem(_('Favorite'));
        this.menu.addMenuItem(this._favorite);
        this._favorite.connect('activate', Lang.bind(this, this._onFavClicked));
        
        this._skip = new PopupMenu.PopupMenuItem(_('Skip'));
        this.menu.addMenuItem(this._skip);
        this._skip.connect('activate', Lang.bind(this, this._onSkipClicked));

        this._delete = new PopupMenu.PopupMenuItem(_('Delete'));
        this.menu.addMenuItem(this._delete);
        this._delete.connect('activate', Lang.bind(this, this._onDeleteClicked));
    },

    _onDestroy: function() {},

    _onFavClicked: function(){
        this.proxy.ToggleFavoriteRemote(function(){})
        this.fav = !this.fav;
        if (this.fav) {
            this._favorite.label.style_class = 'red';
        } else {
            this._favorite.label.style_class = null;
        }
    },

    _onSkipClicked: function() {
        this.proxy.SkipRemote(function(){});
    },

    _onDeleteClicked: function() {
        this.proxy.DeleteRemote(function(){});
    },

    setCurrentPlaying: function(title, artist, channel, fav){
        this._labels.label.text = "Current Playing...\n"+title+"\n"+artist+"\n"+channel;
        if(fav == "1") {
            this._favorite.label.style_class = 'red';
        } else {
            this._favorite.label.style_class = null;
        }
    },

    setAsStopped: function() {
        this._labels.label.text = "Stopped";
    },

    show: function() {
        if (!this.on){
            this.on = true
            Main.panel._leftBox.add(this.actor, { y_fill: true });
        }
    },

    hide: function() {
        if (this.on){
            Main.panel._leftBox.remove(2);
            this.on = false;
        }
    }
};

function DoubanFMProxy() {
    this._init();
    this.ui = null;
}

DoubanFMProxy.prototype = {
    _init: function() {
              DBus.session.proxifyObject (this,
				   'info.sunng.ExaileDoubanfm.instance',
				   '/info/sunng/ExaileDoubanfm');
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

var proxy = new DoubanFMProxy();
proxy.connect('StatusChanged', function(dummy, data){
    let status  = data['Status'];
    if (status == 'Playing') {
        proxy.ui.show()
        let metadata = data['Metadata'];

        title = metadata['title'];
        artist = metadata['artist'];
        channel_name = metadata['channel_name'];
        fav = metadata['like']

        proxy.ui.fav = (fav == '1')
        proxy.ui.setCurrentPlaying(title, artist, channel_name, fav)
    } else if (status == 'Stop') {
        proxy.ui.setAsStopped();
    } else if (status == 'Init') {
        proxy.ui.show();
    } else if (status == 'Exit') {
        proxy.ui.setAsStopped();
        proxy.ui.hide();
    }
});

function main(extensionMeta) {
    let _myPanelButton = new _myButton(proxy);
}

