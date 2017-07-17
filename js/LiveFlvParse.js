(function(){
	var Live={
		//flv的直播地址
		_liveSrc:"",
		//video标签id
		_videoid:"",
		_thisL:null,
		///初始化方法
		init:function(liveSrc,tableID){
			
			this._liveSrc=liveSrc;
			console.log(liveSrc);
			this._videoid=tableID;
			mediaSourceEx.init(this._liveSrc);
			table.init(tableID);
		},
		stop:function(){
			if(mediaSourceEx._reader2)
			{
				mediaSourceEx._reader2.cancel();
			}
		}
	};
	//主要播放库
	var mediaSourceEx={
		mediaSource:null,
		_this:null,
		_liveSrc:"",
		sourceBuffer:null,
		firstRun:false,
		mimeCodec:'video/mp4; codecs="avc1.42E01E, mp4a.40.2"',
		lastVSample:null, 
		lastVDuration:null, 
		vduration:null,
		lastASample:null, 
		lastADuration:null, 
		aduration:null,
		soFar:null,
		_this:null,
		blobs:null,
		//没用完的mp4数据集合
		arr:[],
		//整理好的tag集合
		arrTag:[],
		//第一个metadata tag,第一个视频tag,第一个音频tag  集合
		arrMetaTag:[],
		//半截tag集合
		arrTempCache:[],
		//临时储存u8a
		arrTemp:[],
		//是否读完了第一个MAV
		fristMoov:true,
		//是否赋值了MAV
		fristMoovSet:false,
		//解码open;
		decodeOpen:true,
		//临时tag
		tempTag:[],
			
		testIndex:0,
			
		videoTrackF:{},
		audioTrackF:{},
			
		sclas:1,
		firstSet:false,
		_reader2:"",
		init:function(liveSrc){
			_this=this;
			_this._liveSrc=liveSrc;
			_this.sourceOpen();
		},
		getSrc:function(){
			return URL.createObjectURL(this.mediaSource);
		},
		sourceOpen:function(){
			
				if(!_this.firstRun)
				{
					
					var req = new Request(_this._liveSrc, {method: 'GET', cache: 'default',mode:"cors",header:new Headers()});  
				    fetch(req).then(function(response) {  
				    		//  typeof(response.body)==ReadableStream
				        var reader = response.body.getReader();  
				        _this._reader2=reader;
				        return _this.readr(reader);
				    })
				    _this.firstRun=true;
			   	}
				else
				{
					_this._reader2.cancel();
					 _this.firstRun=false;
					 _this.sourceOpen();
				}
		},
		//解析tags数组
		parseTags:function(arr){
			
			for(var i=0;i<arr.length;i++)
			{
				var tag={};
				tag.bodys=arr[i];
				_this.testIndex+=1;
				tag.id=_this.testIndex;
				switch(arr[i][0]) ///解析标签类型
				{
					case parseInt("8",16):
						tag.type="audio";
						break;
					case parseInt("9",16):
						tag.type="video";
						break;
					case parseInt("12",16):
						tag.type="script";
						break;
				}
				tag.time=_this.getBodyTime(arr[i]);
				if(tag.type!="script")
				{
					if(tag.type=="video")
					{
//						var te=<<4
						switch(arr[i][11]&0x0f)
						{
							case 1:
							tag.ecode="JPEG";
							break;
							case 2:
							tag.ecode="H.263";
							break;
							case 3:
							tag.ecode="Screenvideo";
							break;
							case 4:
							tag.ecode="On2 VP6";
							break;
							case 5:
							tag.ecode="On2 VP6 alpha";
							break;
							case 6:
							tag.ecode="Screen video 2";
							break;
							case 7:
							tag.ecode="AVC/H264";
							break;
						}
					}
					else
					{
						switch(arr[i][11]>>4)
						{
							case 0:
								tag.ecode="Linear PCM";
								break;
								case 1:
									tag.ecode="ADPCM";
								break;
								case 2:
									tag.ecode="MP3";
								break;
								case 3:
									tag.ecode="linear PCM,little";
								break;
								case 4:
									tag.ecode="Nelly 16-khz";
								break;
								case 5:
									tag.ecode="Nelly 8-kHz";
								break;
								case 6:
									tag.ecode="Nellymoser";
								break;
								case 7:
									tag.ecode="G.711 A-law";
								break;
								case 8:
									tag.ecode="G.711 mu-law";
								break;
								case 9:
									tag.ecode="reserved";
								break;
								case 10:
									tag.ecode="AAC";
								break;
								case 14:
									tag.ecode="MP3 8-khz";
								break;
								case 15:
									tag.ecode="Device-specific";
								break;
						}
					}
				}
				else{
					tag.ecode="-";
				}
				if(tag.type=="video")
				{
					switch(arr[i][11]>>4)
					{
						case 1:
							tag.tagType="KeyFrame";
						break;
						case 2:
							tag.tagType="InterFrame";
						break;
						case 3:
							tag.tagType="disposaIframe";
						break;
						case 4:
							tag.tagType="gener Keyframe";
						break;
						case 5:
							tag.tagType="videoinfo";
						break;
					}
				}
				else{
					tag.tagType="-";
				}
				table.addTr(tag);
			}
		},
		readr:function(reader){
				return reader.read().then(function (result) {
		            
            			const chunk = result.value;///Uint8Array

					if (result.done) {
		                console.log("this's over");
		                return reader.cancel();
		            }
            			_this.soFar += chunk.byteLength;
					_this.Progresss(chunk);
            			if(_this.arrMetaTag.length>3&&!_this.fristMoovSet)
            			{
            				_this.arrMetaTag.shift();
            				_this.parseTags(_this.arrMetaTag);
            				_this.fristMoovSet=true;
            			}
            			else if(_this.fristMoovSet&&_this.arrTag.length>0)
            			{
//          				_this.testIndex+=1;
            				
//          				let segpkts = parseMediaSegment(new Uint8Array(_this.arrTag));
            				_this.parseTags(_this.arrTag);
            				_this.arrTag.length=0;
            			}
            			
            			return _this.readr(reader);
            	})
			},
			
			locParse:function(u8ass){
				_this=mediaSourceEx;
				mediaSourceEx.Progresss(u8ass);
            			if(mediaSourceEx.arrMetaTag.length>3&&!mediaSourceEx.fristMoovSet)
            			{
            				mediaSourceEx.arrMetaTag.shift();
            				mediaSourceEx.parseTags(mediaSourceEx.arrMetaTag);
            				mediaSourceEx.fristMoovSet=true;
            			}
            			else if(mediaSourceEx.fristMoovSet&&mediaSourceEx.arrTag.length>0)
            			{
//          				_this.testIndex+=1;
            				
//          				let segpkts = parseMediaSegment(new Uint8Array(_this.arrTag));
            				mediaSourceEx.parseTags(mediaSourceEx.arrTag);
            				mediaSourceEx.arrTag.length=0;
            			}	
			},
			
			sourceBufferOnUpdateend:function(){
				if(_this.arr.length>0)
				{
					var u8a=new Uint8Array(_this.arr.shift());//拿出所有完整的tag
	//							_this.arrTag=[];
					_this.sourceBuffer.appendBuffer(u8a.buffer);
				}
			},
			concatUint8Array:function(list) {
				let len = 0;
				list.forEach(b => len += b.byteLength)
				let res = new Uint8Array(len);
				let off = 0;
				list.forEach(b => {
					res.set(b, off);
					off += b.byteLength;
				})
				return res;
			},
			//拿到u8a一次处理
			Progresss:function(u8a){
				_this.arrTemp=_this.arrTemp.concat(_this.Uint8Array2Array(u8a))
				if(_this.fristMoov&&!_this.fristMoovSet)
				{
					if(_this.arrTemp.length>24)///保证flv的header和metadata的tag header是存在的
					{
						_this.fristMoov=_this.fristMAV(_this.arrTemp)
						return _this.fristMoov;
					}
					return false;
				}
				else
				{
					_this.decodeOpen=true;
					_this.getAVTag(_this.arrTemp);
//					console.log("走其余的tag")
				}
			},
			Uint8Array2Array:function(u8a) {
				var arr = [];
				for (var i = 0; i < u8a.length; i++) {
					arr.push(u8a[i]);
				}
				return arr;
			},
						//第一个metadata,视频tag,音频tag是否读完
			fristMAV:function(u8a){
				//拿出flv header
				if(_this.arrMetaTag.length<1)
				{
					var header=[];
					for(var i=0;i<13;i++)
					{
						header.push(_this.arrTemp.shift());
					}
					_this.arrMetaTag.push(header);
				}
				//拿出metadata
				if(_this.arrMetaTag.length<2)
				{
					
					var meta=[];
					for(i=0;i<11;i++)
					{
						meta.push(_this.arrTemp.shift())
					}
					var bodySize=_this.getBodySize(meta);
					if(_this.arrTemp.length>=(bodySize+4))
					{
						for(i=0;i<(bodySize+4);i++)
						{
							meta.push(_this.arrTemp.shift())
						}
						_this.arrMetaTag.push(meta);
					}
					else
					{
						//如果包体没有那么大,就把临时数组还原,等下次再解析
						_this.arrTemp=meta.concat(_this.arrTemp);
						return false;
					}
				}
				//拿出音频或者视频
				if(_this.arrMetaTag.length<3)
				{
					var Atag=[];
					if(_this.arrTemp.length>11)
					{
						for(i=0;i<11;i++)
						{
							Atag.push(_this.arrTemp.shift())
						}
					}
					else
					{
						return false;
					}
					var bodySize=_this.getBodySize(Atag);
					if(_this.arrTemp.length>=(bodySize+4))
					{
						for(i=0;i<(bodySize+4);i++)
						{
							Atag.push(_this.arrTemp.shift())
						}
						_this.arrMetaTag.push(Atag);
					}
					else
					{
						//如果包体没有那么大,就把临时数组还原,等下次再解析
						_this.arrTemp=Atag.concat(_this.arrTemp);
						return false;
					}
				}
				//拿出音频或者视频
				if(_this.arrMetaTag.length<4)
				{
					var Vtag=[];
					if(_this.arrTemp.length>11)
					{
						for(i=0;i<11;i++)
						{
							Vtag.push(_this.arrTemp.shift())
						}
					}
					else
					{
						return false;
					}
					var bodySize=_this.getBodySize(Vtag);
					if(_this.arrTemp.length>=(bodySize+4))
					{
						for(i=0;i<(bodySize+4);i++)
						{
							Vtag.push(_this.arrTemp.shift())
						}
						_this.arrMetaTag.push(Vtag);
						return true;
					}
					else
					{
						//如果包体没有那么大,就把临时数组还原,等下次再解析
						_this.arrTemp=Vtag.concat(_this.arrTemp);
						return false;
					}
				}
			},
			//获取包体大小
			getBodySize:function(arr){
				var a=arr[1].toString(16).length==1?"0"+arr[1].toString(16):arr[1].toString(16);
				var b=arr[2].toString(16).length==1?"0"+arr[2].toString(16):arr[2].toString(16);
				var c=arr[3].toString(16).length==1?"0"+arr[3].toString(16):arr[3].toString(16);
				return parseInt((a+""+b+""+c),16)
			},
			//获取包体时间戳
			getBodyTime:function(arr){
				var a=arr[4].toString(16).length==1?"0"+arr[4].toString(16):arr[4].toString(16);
				var b=arr[5].toString(16).length==1?"0"+arr[5].toString(16):arr[5].toString(16);
				var c=arr[6].toString(16).length==1?"0"+arr[6].toString(16):arr[6].toString(16);
				var t=parseInt((a+""+b+""+c),16);
				var ts=parseInt(t/(60000))+":"+parseInt(t%(60000)/1000)+":"+parseInt(t%1000);
				return ts;
			},
			//获取完整的tag
			getAVTag:function(u8a){
				while(_this.decodeOpen){
					if(u8a.length>11)
					{
						_this.tempTag=[];
						for(var i=0;i<11;i++)
						{
							_this.tempTag.push(_this.arrTemp.shift())
						}
					}
					else
					{
						_this.decodeOpen=false;
						continue;
					}
					var bodySize=_this.getBodySize(_this.tempTag);
					if(_this.getBodySize(_this.tempTag)==35)
					{
						_this.getBodySize(_this.tempTag);
					}
					if(_this.arrTemp.length>=(bodySize+4))
					{
						for(i=0;i<(bodySize+4);i++)
						{
							_this.tempTag.push(_this.arrTemp.shift())
						}
//						arrTag.push(_this.tempTag);
					}
					else
					{
						//如果包体没有那么大,就把临时数组还原,等下次再解析
						_this.arrTemp=_this.tempTag.concat(_this.arrTemp);
						_this.decodeOpen=false;
						continue;
					}
//					arrTag.push(_this.tempTag);
//					_this.arrTag=_this.arrTag.concat(_this.tempTag);
					_this.arrTag.push(_this.tempTag);
				}
			},
	};
	//播放器
	var videoEx={
		video:null,
		_thisM:null,
		init:function(videoid){
			_thisM=this;
			_thisM.video=document.getElementById(videoid);
		},
		src:function(src){
			_thisM.video.src=src;
			_thisM.video.play();
			_thisM.video.addEventListener("loadedmetadata",_thisM.loadedmetadata)
			_thisM.video.addEventListener("timeupdate",_thisM.timeupdate)
			_thisM.video.addEventListener('ended',_thisM.endFun,false)
			_thisM.video.addEventListener('error',_thisM.errorFun,false);
		},
		loadedmetadata:function(){
			console.log("获取metadata成功");
			var div=document.getElementById("time");
			div.innerHTML="/"+parseInt(_thisM.video.duration);
		},
		endFun:function(){
			console.log("stop")
		},
		errorFun:function(e){
			console.log("error",e,elem.error)		
		},
		timeupdate:function(){
			var div=document.getElementById("time");
			div.innerHTML=parseInt(_thisM.video.currentTime)+"/"+parseInt(_thisM.video.duration);
		}
	};
	var table={
		_table:"",
		_thisT:"",
		_dic:{},
		init:function(id){
			_thisT=this;
//			_thisT._table=document.getElementById(id)
//			_thisT._table.appendChild(_thisT.title());
		},
		title:function(){
			var tr=document.createElement("tr");
			tr.className='danger2';
			tr.innerHTML="<td>#</td>"
						+"<td>类型</td>"
						+"<td>时间戳</td>"
						+"<td>编码</td>"
						+"<td>帧类型</td>"
						+"<td>帧大小</td>"
						+"<td>详情</td>";
			return tr;
		},
		addTr:function(obj){
//			var tr=document.createElement("tr");
//			switch(obj.type){
//				case "script":
//				tr.className="active2"
//				break;
//				case "video":
//				if(obj.tagType=="KeyFrame")
//				tr.className="success2"
//				else
//				tr.className="success3"
//				break;
//				case "audio":
//				tr.className="info2"
//				break;
//			}
			var bos=obj.bodys;
			var s=bos;
			_thisT._dic[obj.id-1]=s;
//			tr.innerHTML="<td>"+obj.id+"</td>"
//						+"<td>"+obj.type+"</td>"
//						+"<td>"+obj.time+"</td>"
//						+"<td>"+obj.ecode+"</td>"
//						+"<td>"+obj.tagType+"</td>"
//						+"<td>"+obj.bodys.length+"</td>"
//						+"<td><button value='详情' onClick='window.detail("+obj.id+")'>详情</button></td>";
//			_thisT._table.appendChild(tr);
			
			v_table.addDetail(obj.type,obj.time,obj.ecode,obj.tagType,obj.bodys.length)
		},
		clear:function(){
//			_thisT._table.innerHTML="";
			v_table.details=[];
		}
	}
	function detail(ss_str){
		console.log(table._dic[ss_str].join("  "))
		document.getElementById("detailTxt").innerHTML=(getDetail(table._dic[ss_str]))
	}
	
	function getDetail2(arr){
		var str="";
		var temp="";
		for(var i=0;i<arr.length;i++)
		{
			var tes=arr[i].toString(16);
			switch(i)
			{
				case 0:
					str+="<div>Tags类型:&nbsp<abbr title='tags类型'>"+tes+"</abbr></div>"
					break;
				case 1:
				case 2:
				case 3:
				case 4:
					temp=temp+tes+" "
					if(i==3)
					{
						str+="<div>时间戳:&nbsp<abbr title='时间戳'>"+temp+"</abbr></div>"
						temp="";
					}
					break;
				
				case 5:
				case 6:
				case 7:
					temp=temp+tes+" "
					if(i==7)
					{
						str+="<div>body大小:&nbsp<abbr title='body大小'>"+temp+"</abbr></div>"
						temp="";
					}
					
					break;
				case 8:
				case 9:
				case 10:
					temp=temp+tes+" "
					if(i==10)
					{
						str+="<div>StreamID:&nbsp<abbr title='streamID'>"+temp+"</abbr></div>"
						temp="";
					}
					break;
				default:
					temp=temp+tes+" ";
					if(i==(arr.length-5))
					{
						str+="<div>Body:&nbsp<abbr title='包体'>"+temp+"</abbr></div>"
						temp="";
					}
					if(i==(arr.length-1))
					{
						str+="<div>整个tag大小:&nbsp<abbr title='tag大小'>"+temp+"</abbr></div>"
						temp="";
					}
					break;
			}
		}
		return str;
	}
	
	
	function getDetail(arr){
		var str="";
		var temp="";
		for(var i=0;i<arr.length;i++)
		{
			var tes=arr[i].toString(16);
			switch(i)
			{
				case 0:
					str+="<div>Tags类型:&nbsp<abbr title='tags类型'>"+tes+"</abbr></div>"
					break;
				case 1:
				case 2:
				case 3:
					temp=temp+tes+" "
					if(i==3)
					{
						str+="<div>body大小:&nbsp<abbr title='body大小'>"+temp+"</abbr></div>"
						temp="";
					}
					break;
				case 4:
				case 5:
				case 6:
				case 7:
					temp=temp+tes+" "
					if(i==7)
					{
						str+="<div>时间戳及扩展时间戳:&nbsp<abbr title='时间戳及扩展时间戳'>"+temp+"</abbr></div>"
						temp="";
					}
					
					break;
				case 8:
				case 9:
				case 10:
					temp=temp+tes+" "
					if(i==10)
					{
						str+="<div>StreamID:&nbsp<abbr title='streamID'>"+temp+"</abbr></div>"
						temp="";
					}
					break;
				default:
					temp=temp+tes+" ";
					if(i==(arr.length-5))
					{
						str+="<div>Body:&nbsp<abbr title='包体'>"+temp+"</abbr></div>"
						temp="";
					}
					if(i==(arr.length-1))
					{
						str+="<div>整个tag大小:&nbsp<abbr title='tag大小'>"+temp+"</abbr></div>"
						temp="";
					}
					break;
			}
		}
		return str;
	}
	var v_table=null;
	window.onload=function(){
		v_table=new Vue({
			el:"#detailTable",
			data:{
				details:[],
			},
			methods:{
				addDetail:function(type,time,code,keyType,frameSize){
					this.details.push({type:type,time:time,code:code,keytype:keyType,framesize:frameSize})
				},
				getDetail:function(index){
					if(mediaSourceEx._this==null){
						window.showDetail(index);
					}else{
						detail(index);
					}
					
				},
				getTrClass:function(id){
					var detail=this.details[id];
					return detail.type=='video'?(detail.keytype=='KeyFrame'?'success2':'success3'):(detail.type=='script'?'active2':'info2')
				}
			},
			computed:{
				
			}
		})
		window.v_table=v_table;
	}
	window.detail=detail;
	window.Live=Live;
	window.locParse=mediaSourceEx.locParse;
	window.showDetail=function(index){
		document.getElementById("detailTxt").innerHTML=(getDetail2(Tagarr[index].bodys2))
	}
})()