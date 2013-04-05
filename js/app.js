window.VideoModel = Backbone.Model.extend({
  defaults: {
    "selected":  false
  }	
});

window.Channel = Backbone.Collection.extend({

	model: VideoModel,

	url: 'https://gdata.youtube.com/feeds/api/playlists/67DEB98D8D9CF0F7?v=2&alt=json-in-script&max-results=6',

	parse: function (response) {
		this.channelLink = response.feed.link[0].href;
		this.numberOfVideos = response.feed.openSearch$totalResults.$t;
		return _(response.feed.entry).map(function (row) {
			return (row.media$group);
		});
	},
});

// Views
window.VideoView = Backbone.View.extend({

	tagName: "li",

	className: "video",

	template: _.template($('#videotemplate').html()),

	events: {
		'click': 'set_selected'
	},

	initialize: function() {
		this.$el.attr('videoid', this.model.get("yt$videoid").$t);
		this.model.on("change:selected", this.updateState, this);
		this.render(this.model);
	},

	set_selected: function() {
		// User can't deselect a video
		this.model.set('selected', true);
	},

	updateState: function() {
		this.$el.toggleClass('videohighlight', this.model.get("selected"));
	},

	render: function() {
		this.$el.html(this.template(this.model.attributes));
		return this;
	}

});

/*
  Main Channel view, controls main video + side videos.
  Connects to the mainChannel model.
*/
window.ChannelView = Backbone.View.extend({

	el: "#main",

	initialize: function () {
		this.collection.on("sync", this.render, this);
		this.collection.on("change:selected", this.updateState, this);
	},

	updateState: function(model, attributes) {
		// We only want to act on selected model
		if (attributes) {
			// Lets unselect any existing model
			var selected = this.collection.where({"selected": true});
			_.each(selected, function(video) {
				if (video.cid != model.cid) {
					video.set("selected", false)
				}				
			})

			// load video
			this.initVideo(model.get("yt$videoid").$t);
		}
	},

	render: function () {

		// Divide videos between right/left panels
		for (video in this.collection.models) {
			var videoView = new VideoView({model: this.collection.models[video]});
			if (video % 2 == 0) 
				this.$('.leftvideolist').append(videoView.el);
			else 
				this.$('.rightvideolist').append(videoView.el);
		};

		this.collection.models[0].set("selected", true);

		return this;
	},

	initVideo: function (id) {
		if (typeof (window.player) != 'undefined') {
			window.player.cueVideoById(id);
		} else {
			window.player = new YT.Player('mainvideo', {
				height: '420',
				width: '640',
				videoId: id,
				playerVars: {
					wmode: "opaque"
				}
			});
		}
	},

	close: function (callback) {
		if (typeof window.player !== 'undefined')
			window.player.pauseVideo();
		this.$(".leftvideolist").empty();
		this.$(".rightvideolist").empty();
	}

});

// Router

var AppRouter = Backbone.Router.extend({

	routes: {

		"": 'channel',
		"channel/:id": "channel"
	},

	initialize: function() {
		this.mainChannel = new Channel();
		this.channelView = new ChannelView({collection: this.mainChannel});
	},

	channel: function (id) {

		if (typeof (id) != 'undefined') 
			this.mainChannel.url = 'https://gdata.youtube.com/feeds/api/playlists/' + id + '?v=2&alt=json-in-script&max-results=6';

		this.channelView.close();
		this.mainChannel.fetch({dataType: "jsonp"});
	},

});

var app = new AppRouter();
Backbone.history.start();