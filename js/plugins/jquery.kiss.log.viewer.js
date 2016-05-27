(function($) {
	var PLUGIN_NAME = 'kiss.log.viewer', pluginData = function(obj) {
		return obj.data(PLUGIN_NAME);
	};

	var FIELDS = {
			'RXcommands' : {
					group: 'Receiver',
					min : 1000,
					max : 2000,
					name: ['Throttle', 'Roll', 'Pitch', 'Yaw', 'Aux1', 'Aux2', 'Aux3', 'Aux4']
			},
			'PWMOutVals' : {
					group: 'Motors',
					min: 1000,
					max: 2000,
					name: ['Motor 1', 'Motor 2', 'Motor 3', 'Motor 4', 'Motor 5', 'Motor 6']
			},
			'GyroRaw' : {
				group: 'Gyro raw',
				min: -1,
				max: 1,
				name: ['Pitch', 'Roll', 'Yaw']
		}
	}
	
	var privateMethods = {
		build : function(self) {
			var data = pluginData(self);
			var id = self.attr("id");
			var width = self.width();
			var height = self.height();
			var c = $('<canvas>').attr('id', id + "_canvas").attr("width",
					width).attr("height", height);
			c.appendTo(self);

			data.canvas = document.getElementById(id + "_canvas");
			data.context = data.canvas.getContext('2d');
		},
		seekToFrame : function(self, frame) {
			console.log("Seeking to frame: " + frame);
			var data = pluginData(self);
			data.currentFrame = frame;
			privateMethods.refresh(self);
		},
		dataDetails : function(self, cursor) {
      var data = pluginData(self);
      if (data.frames.length == 0) return
			privateMethods.refresh(self);
			var context = data.context;
			context.fillStyle = "rgba(255, 255, 255, 1)";
			context.fillRect(cursor, 0, 1, self.height());

      var label = ' ';
      for (var i = 0; i < FIELDS['RXcommands'].name.length; i++ ) {
        label = label + FIELDS['RXcommands'].name[i] + " :" +data.frames[Math.floor(data.startFrame + (cursor * data.scale))].RXcommands[i] + " ";
      }
      $("#details").html(label);
		},
    handleZoom : function(self, event) {
      var data = pluginData(self);
      if (data.frames.length == 0) return
        if (event.originalEvent.wheelDelta > 0 || event.originalEvent.detail < 0) {
          if (data.scale < 1) data.scale = data.scale + 0.1
        }
        else {
          if (data.scale > 0.2) data.scale = data.scale - 0.1
        }
      privateMethods.refresh(self);
    },
		drawChart: function(self, field, index, x1, y1, x2, y2, color, startFrame) {
			var data = pluginData(self);
			var context = data.context;
			
			context.strokeStyle = color;
			var frame = startFrame, x = x1;
			context.beginPath();
			while (x < x2 && Math.floor(frame) < data.frames.length) {
				var value=0;
				var c1 = (FIELDS[field].max+FIELDS[field].min)/2;
				var c2 = (FIELDS[field].max-FIELDS[field].min)/2;
				var c3 = (y2-y1)/2;
				if (index!=-1) {
					value =  (data.frames[Math.floor(frame)][field][index] - c1) / c2;
				} else {
					value =  (data.frames[Math.floor(frame)][field] - c1) / c2;
				}
				if (x == x1) {
					context.moveTo(x, y1+c3-value*c3*0.9);
				} else {
					context.lineTo(x, y1+c3-value*c3*0.9);
				}
				x++;
				frame += data.scale;
			}
			context.stroke();
		},
		refresh : function(self) {
			var data = pluginData(self);
			// here we will render the graph. Current frame in the middle.
			var width = self.width(), height=self.height(), h2=height/2, framesVisible = width * data.scale, startFrame = data.currentFrame
					- framesVisible / 2;
			if (startFrame < 0) startFrame = 0;
			console.log("Center: " + data.currentFrame);
			console.log("Start: " + startFrame);
			console.log("Visible: " + framesVisible);

			var colors = [ "rgb(255, 0, 0)", "rgb(255, 128, 0)",
					"rgb(255, 255, 0)", "rgb(0, 255, 0)", "rgb(0, 0, 255)",
					"rgb(128, 0, 255)", "rgb(40, 30, 255)", "rgb(128, 40, 25)", "rgb(128, 90, 255)" ];

			var context = data.context;
			context.fillStyle = "rgb(0, 0, 0)";
			context.fillRect(0, 0, self.width(), self.height());
			
			var chartHeight = height / data.charts.length; // one chart
			var k=0;
			
			for (var i = 0; i<data.charts.length; i++) {
				var chart = data.charts[i];
				console.log("Drawing chart " + i);
				for (var f = 0; f<chart.length; f++) {
					var field = chart[f];
					if (field.indexOf('.')>0) {
						console.log("Indexed property " + field);
						var v = field.split('.');
						privateMethods.drawChart(self, field[0], +field[1], 0, i*chartHeight, width, (i+1)*chartHeight, colors[k++], startFrame);
						if (k>7) k=0;
					} else {
						if (FIELDS[field].name instanceof Array ) {
							for (var j=0; j<FIELDS[field].name.length; j++) {
								console.log("Drawing field " + FIELDS[field].group+"->"+FIELDS[field].name[j]);
								privateMethods.drawChart(self, field, j, 0, i*chartHeight, width, (i+1)*chartHeight, colors[k++], startFrame);
								if (k>7) k=0;
							}
						} else {
							privateMethods.drawChart(self, field, -1, 0, i*chartHeight, width, (i+1)*chartHeight, colors[k++], startFrame);
							if (k>7) k=0;
						}
					}
				}
			}

      data.startFrame = startFrame;
		},
		decodeFrame : function(i, data) {
			var obj = {};
			obj.RXcommands = [];
			obj.GyroXYZ = [];
			obj.ACCXYZ = [];
			obj.angle = [];
			obj.GyroRaw = [];
			obj.ACCRaw = [];
			obj.ACCtrim = [];
			obj.ACCAng = [];
			obj.PWMOutVals = [];
			obj.ESC_Telemetrie0 = [];
			obj.ESC_Telemetrie1 = [];
			obj.ESC_Telemetrie2 = [];
			obj.ESC_Telemetrie3 = [];
			obj.ESC_Telemetrie4 = [];
			obj.ESC_Telemetrie5 = [];
			obj.ESC_TelemetrieStats = [];

			obj.RXcommands[0] = 1000 + ((data.getInt16(i + 0, 0) / 1000) * 1000);
			obj.RXcommands[1] = 1500 + ((data.getInt16(i + 2, 0) / 1000) * 500);
			obj.RXcommands[2] = 1500 + ((data.getInt16(i + 4, 0) / 1000) * 500);
			obj.RXcommands[3] = 1500 + ((data.getInt16(i + 6, 0) / 1000) * 500);
			obj.RXcommands[4] = 1500 + ((data.getInt16(i + 8, 0) / 1000) * 500);
			obj.RXcommands[5] = 1500 + ((data.getInt16(i + 10, 0) / 1000) * 500);
			obj.RXcommands[6] = 1500 + ((data.getInt16(i + 12, 0) / 1000) * 500);
			obj.RXcommands[7] = 1500 + ((data.getInt16(i + 14, 0) / 1000) * 500);
			obj.Armed = data.getUint8(i + 16);
			obj.LiPoVolt = data.getInt16(i + 17, 0) / 1000;
			obj.GyroXYZ[0] = data.getInt16(i + 19, 0);
			obj.GyroXYZ[1] = data.getInt16(i + 21, 0);
			obj.GyroXYZ[2] = data.getInt16(i + 23, 0);
			obj.ACCXYZ[0] = data.getInt16(i + 25, 0);
			obj.ACCXYZ[1] = data.getInt16(i + 27, 0);
			obj.ACCXYZ[2] = data.getInt16(i + 29, 0);
			obj.angle[0] = data.getInt16(i + 31, 0) / 1000;
			obj.angle[1] = data.getInt16(i + 33, 0) / 1000;
			obj.angle[2] = data.getInt16(i + 35, 0) / 1000;
			obj.I2C_Errors = data.getInt16(i + 37, 0);
			obj.calibGyroDone = data.getInt16(i + 39, 0);
			obj.failsave = data.getUint8(i + 41);
			obj.debug = data.getUint16(i + 42, 0) / 1000;
			obj.foundRX = data.getUint8(i + 44);

			obj.GyroRaw[0] = data.getInt16(i + 45, 0) / 1000;
			obj.GyroRaw[1] = data.getInt16(i + 47, 0) / 1000;
			obj.GyroRaw[2] = data.getInt16(i + 49, 0) / 1000;
			obj.ACCRaw[0] = data.getInt16(i + 51, 0) / 1000;
			obj.ACCRaw[1] = data.getInt16(i + 53, 0) / 1000;
			obj.ACCRaw[2] = data.getInt16(i + 55, 0) / 1000;
			obj.ACCtrim[0] = data.getInt16(i + 57, 0) / 1000;
			obj.ACCtrim[1] = data.getInt16(i + 59, 0) / 1000;
			obj.ACCAng[0] = data.getInt16(i + 61, 0) / 1000;
			obj.ACCAng[1] = data.getInt16(i + 63, 0) / 1000;
			obj.mode = data.getUint8(i + 65);
			obj.debug = data.getUint16(i + 66, 0) / 1000;
			obj.PWMOutVals[0] = data.getInt16(i + 68, 0);
			obj.PWMOutVals[1] = data.getInt16(i + 70, 0);
			obj.PWMOutVals[2] = data.getInt16(i + 72, 0);
			obj.PWMOutVals[3] = data.getInt16(i + 74, 0);
			obj.PWMOutVals[4] = data.getInt16(i + 76, 0);
			obj.PWMOutVals[5] = data.getInt16(i + 78, 0);
			obj.debug2 = data.getUint16(i + 80, 0) / 1000;
			obj.idleTime = data.getUint8(i + 82);

			obj.ESC_Telemetrie0[0] = data.getInt16(i + 83, 0);
			obj.ESC_Telemetrie0[1] = data.getInt16(i + 85, 0);
			obj.ESC_Telemetrie0[2] = data.getInt16(i + 87, 0);
			obj.ESC_Telemetrie0[3] = data.getInt16(i + 89, 0);
			obj.ESC_Telemetrie0[4] = data.getInt16(i + 91, 0);

			obj.ESC_Telemetrie1[0] = data.getInt16(i + 93, 0);
			obj.ESC_Telemetrie1[1] = data.getInt16(i + 95, 0);
			obj.ESC_Telemetrie1[2] = data.getInt16(i + 97, 0);
			obj.ESC_Telemetrie1[3] = data.getInt16(i + 99, 0);
			obj.ESC_Telemetrie1[4] = data.getInt16(i + 101, 0);

			obj.ESC_Telemetrie2[0] = data.getInt16(i + 103, 0);
			obj.ESC_Telemetrie2[1] = data.getInt16(i + 105, 0);
			obj.ESC_Telemetrie2[2] = data.getInt16(i + 107, 0);
			obj.ESC_Telemetrie2[3] = data.getInt16(i + 109, 0);
			obj.ESC_Telemetrie2[4] = data.getInt16(i + 111, 0);

			obj.ESC_Telemetrie3[0] = data.getInt16(i + 113, 0);
			obj.ESC_Telemetrie3[1] = data.getInt16(i + 115, 0);
			obj.ESC_Telemetrie3[2] = data.getInt16(i + 117, 0);
			obj.ESC_Telemetrie3[3] = data.getInt16(i + 119, 0);
			obj.ESC_Telemetrie3[4] = data.getInt16(i + 121, 0);

			obj.ESC_Telemetrie4[0] = data.getInt16(i + 123, 0);
			obj.ESC_Telemetrie4[1] = data.getInt16(i + 125, 0);
			obj.ESC_Telemetrie4[2] = data.getInt16(i + 127, 0);
			obj.ESC_Telemetrie4[3] = data.getInt16(i + 129, 0);
			obj.ESC_Telemetrie4[4] = data.getInt16(i + 131, 0);

			obj.ESC_Telemetrie5[0] = data.getInt16(i + 133, 0);
			obj.ESC_Telemetrie5[1] = data.getInt16(i + 135, 0);
			obj.ESC_Telemetrie5[2] = data.getInt16(i + 137, 0);
			obj.ESC_Telemetrie5[3] = data.getInt16(i + 139, 0);
			obj.ESC_Telemetrie5[4] = data.getInt16(i + 141, 0);

			obj.ESC_TelemetrieStats[0] = data.getInt16(i + 142, 0);
			obj.ESC_TelemetrieStats[1] = data.getInt16(i + 144, 0);
			obj.ESC_TelemetrieStats[2] = data.getInt16(i + 146, 0);
			obj.ESC_TelemetrieStats[3] = data.getInt16(i + 148, 0);
			obj.ESC_TelemetrieStats[4] = data.getInt16(i + 150, 0);
			obj.ESC_TelemetrieStats[5] = data.getInt16(i + 152, 0);
			return obj;
		}
	};

	var publicMethods = {
		init : function(options) {
			return this.each(function() {
				var self = $(this), data = pluginData(self);
				if (!data) {
					self.data(PLUGIN_NAME, $.extend(true, {
						data : undefined,
						currentFrame : 0,
						scale : 0.5,
						frames : [],
						canvas : null,
						context : null,
						charts: [
						         	['RXcommands'],
						         	['PWMOutVals'],
						         	['GyroRaw']
						         ]
					}, options));
					data = pluginData(self);
				}
				privateMethods.build(self);
        
				self.on("mousemove", function(event) {
					privateMethods.dataDetails(self, event.offsetX);
				});

        self.on("mouseout", function(event) {
          var data = pluginData(self);
          if (data.frames.length == 0) return
          privateMethods.refresh(self);
        });

        $(self).bind('mousewheel DOMMouseScroll', function(event){
          privateMethods.handleZoom(self, event)
        });

        $(window).on('resize', function(event){
          var viewer = $('#' + self.attr("id") + "_canvas")
          viewer[0].width = window.innerWidth;
          viewer[0].height = window.innerHeight;
          var data = pluginData(self);
          if (data.frames.length == 0) return
          privateMethods.refresh(self);
        });

				$(document).on("kiss:seek_to_frame", function(event, frame) {
					console.log("Seeking to frame: " + frame);
					privateMethods.seekToFrame(self, frame);
				});
			});
		},
		destroy : function() {
			return this.each(function() {
				$(this).removeData(PLUGIN_NAME);
			});
		},
		loadData : function(blob) {
			var self = $(this);
			var data = pluginData(self);
			var tmp = new DataView(blob, 0);
			data.frames = [];

			var i = 0;
			var f = 0;

			while (true) {
				while (i < tmp.byteLength && tmp.getInt8(i) != 5)
					i++;
				if ((i + 1) < tmp.byteLength) {
					var len = tmp.getUint8(i + 1);
					if ((i + 3 + len) < tmp.byteLength
							&& tmp.getInt8(i + 3 + len) == 5) {
						var frameData = privateMethods.decodeFrame(i + 2, tmp);
						if (data.frames.length==0) console.log(frameData);
						data.frames.push(frameData);
						i += len + 2;
						f++;
					} else {
						i++;
					}
				} else {
					break;
				}
			}
			$(document).trigger("kiss:set_frames", [ data.frames ]); // set
																		// pagers
			privateMethods.refresh(self);
		},

	};

	$.fn.kissLogViewer = function(method) {
		if (publicMethods[method]) {
			return publicMethods[method].apply(this, Array.prototype.slice
					.call(arguments, 1));
		} else if (typeof method === 'object' || !method) {
			return publicMethods.init.apply(this, arguments);
		} else {
			$.error('Method [' + method + '] not available in $.kissLogViewer');
		}
	};
})(jQuery);
