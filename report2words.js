let apMetar =
	"METAR ZGSZ AUTO 111200Z 36008G12MPS 200V360 8000 R16/0550V1500U TSRA BR NSC 17/15 Q1015 RETSRA NOSIG"
//BECMG AT0735 12008MPS 0800 BR FG GR +TSRA FEW015 SCT020 BKN025CB=";
let apTaf =
	"TAF AMD ZGSZ 111710Z 111212 10002MPS 6000 BR SCT011 BKN030 TX18/06Z TN14/22Z BECMG 1416 36008G15MPS 2500 -TSRA BKN023 OVC050 TEMPO 1218 36002MPS 0800 TSRA SCT011 FEW020CB OVC030="
//apTaf = "TAF AMD ZSLQ 251239Z 252106 02004MPS 1200 BR SCT012 OVC040 TX20/12Z TN17/21Z TEMPO 1216 0600 FG -DZ="
const fs = require('fs');
const dict = JSON.parse(fs.readFileSync("./dict.json"));
// 
console.log(apTaf, report2words(apTaf));
console.log(apMetar, report2words(apMetar));
// 

function report2words(report) {
	let rawReport = report.replace("=", "").split(" "),
		words = [],
		n = 0;
	//报头
	words.push(dict[rawReport[n]]);
	n++;
	let tafvalidtime = "";
	if (/\d{6} /.test(report)) {
		let vt = /\d{6} /.exec(report)[0];
		let startdate = Number(vt.substr(0, 2)),
			enddate;
		let starthour = Number(vt.substr(2, 2));
		let endhour = Number(vt.substr(4, 2));
		if (starthour - endhour <= 0)
			enddate = startdate;
		else
			enddate = startdate + 1;
		tafvalidtime = "有效时间" + startdate + "日" + starthour + "时—" + enddate + "日" + endhour + "时的";
	}
	if (/[AMDCOR]{3}/.test(rawReport[n])) {
		let sendtime=/\d{6}Z/.exec(report)[0];
		let timewords = sendtime.substr(0, 2) + "日" + sendtime.substr(2, 2) + "时" + sendtime.substr(4,
			2) + "分UTC";
		words[0] = rawReport[n + 1] + timewords + "发布的" + tafvalidtime + words[0] + dict[rawReport[n]];

	} else {
		let sendtime=/\d{6}Z/.exec(report)[0];
		let timewords = sendtime.substr(0, 2) + "日" + sendtime.substr(2, 2) + "时" + sendtime.substr(4,
			2) + "分UTC"
		let auto = /AUTO/.test(report) ? "自动化(AUTO)" : "";
		words[0] = rawReport[n] + timewords + "发布的" + tafvalidtime + auto + words[0];

	}
	//找到风组
	while (!/MPS|KT/.test(rawReport[n])) n++;
	words.push(element2words("wind", rawReport[n]));
	n++;
	//风向变化
	if (/\d{3}V\d{3}/.test(rawReport[n])) {
		words.push("风向在" + /\d{3}/.exec(rawReport[n])[0] + "到" + /V\d{3}/.exec(rawReport[n])[0].replace("V", "") + "间变化");
		n++;
	}
	//是否时CAVOK
	if (rawReport[n] === "CAVOK") {
		words.push(element2words("CAVOK", rawReport[n]));
	} else {
		while (n < rawReport.length) {
			if (/BECMG|TEMPO|FM/.test(rawReport[n])) {
				if (/TAF/.test(report)) {
					switch (true) {
						case /BECMG/.test(rawReport[n]):
							{
								words.push("预计在" + Number(rawReport[n + 1].substr(0, 2)) + "时——" + Number(rawReport[n + 1].substr(2, 2)) +
									"时发生渐变:");
								n = n + 2;
								break;
							}
						case /TEMPO/.test(rawReport[n]):
							{
								words.push("预计在" + Number(rawReport[n + 1].substr(0, 2)) + "时——" + Number(rawReport[n + 1].substr(2, 2)) +
									"时短时出现:");
								n = n + 2;
								break;
							}
						case /FM/.test(rawReport[n]):
							{
								words.push("预计在" + Number(rawReport[n + 1].substr(0, 2)) + "时" + Number(rawReport[n + 1].substr(2, 2)) +
									"分发生变化:");
								n = n + 2;
								break;
							}
					}
				} else if (/METAR/.test(report) || /SPECI/.test(report)) {
					switch (true) {
						case /BECMG/.test(rawReport[n]):
							{
								let l = words.length;
								words.push("预计");

								if (/FM/.test(rawReport[n + 1])) {
									words[l] = words[l] + "从" + Number(rawReport[n + 1].substr(2, 2)) + "时" + Number(rawReport[n + 1].substr(4, 2)) +
										"分";
								}
								if (/AT/.test(rawReport[n + 1])) {
									words[l] = words[l] + "在" + Number(rawReport[n + 1].substr(2, 2)) + "时" + Number(rawReport[n + 1].substr(4, 2)) +
										"分";
								}
								if (/TL/.test(rawReport[n + 1])) {
									words[l] = words[l] + "到" + Number(rawReport[n + 1].substr(2, 2)) + "时" + Number(rawReport[n + 1].substr(4, 2)) +
										"分";
								}
								words[l] = words[l] + "出现:";
								n = n + 2;
								break;
							}
						case /TEMPO/.test(rawReport[n]):
							{
								words.push("预计短时出现:");
								n = n + 1;
								break;
							}
						case /NOSIG/.test(rawReport[n]):
							{
								words.push("预计2小时内天气无重大变化");
							}
					}
				}

			} else {

				if (elementiswhat(rawReport[n]) === "weather") {
					let w = []
					while (elementiswhat(rawReport[n]) === "weather" && n < rawReport.length) {
						w.push(element2words("weather", rawReport[n]));

						n++;
					}
					words.push("天气现象：" + w.join(","));
				}
				if (n < rawReport.length) {
					words.push(element2words(elementiswhat(rawReport[n]), rawReport[n]));
					n++;
				}
			}
		}
	}

	return words;

}

function elementiswhat(code) {
	switch (true) {
		case /MPS/.test(code):
			{
				return "wind";
			}
		case (/Q/.test(code)):
			{
				return "qnh";
			}
		case (/R\d{2}/.test(code)):
			{
				return "rvr";
			}
		case /\d{4}/.test(code):
			{
				return "vis";
			}
		case (/[FEWSCTBKNOVC]{3}\d{3}/.test(code) || /VV/.test(code) || /NSC/.test(code) || /\/\/\/\/\//.test(code)):
			{
				return "cloud";
			}
		case (/RE/.test(code)):
			{
				return "re";
			}
		case (/TX/.test(code) || /TN/.test(code)):
			{
				return "taftemp";
			}
		case (/\d{2}\/\d{2}/.test(code)):
			{
				return "metartemp";
			}
		case (/NOSIG/.test(code)):
			{
				return "nosig";
			}
		default:
			return "weather";
	}
}

function element2words(type, code) {
	switch (type) {
		case "wind":
			{
				let windarr = getWind(code);
				if (windarr[2] === "") {
					return "风向" + windarr[0] + ",风速" + Number(windarr[1]) + "米/秒";
				} else {
					return "风向" + windarr[0] + ",风速" + Number(windarr[1]) + "米/秒" + ",阵风" + windarr[2] + "米/秒";
				}
			}
		case "CAVOK":
			{
				return dict[code];
			}
		case "vis":
			{
				return "能见度" + Number(code) + "米";
			}
		case "weather":
			{
				let weather = "";
				if (/\/\//.test(code)) {
					weather = "未观测天气";
				}
				weather=toTianQiXianXiang(code);
				return weather;
			}
		case "cloud":
			{
				let cloud = "";
				if (code === "/////") {
					cloud = "未观测云";
				}
				else if(code==="NSC"){
					cloud=dict[code];
				}
				else {
					cloud = dict[/[A-Z]+/.exec(code)[0]] + ",云高" + Number(/\d+/.exec(code)[0]) * 30 + "米";
					if (/CB/.test(code)) {
						cloud = cloud + ",积雨云";
					}
				}
				return cloud;
			}
		case "taftemp":
			{
				let temp = "";
				let m = /M/.test(code) ? "-" : "";
				if (/TX/.test(code)) {
					temp = "最高温度";
				} else {
					temp = "最低温度";
				}
				temp = temp + m.toString() + parseInt(/\d{2}\//.exec(code)[0]) + "℃，出现在" + parseInt(/\d{2}Z/.exec(code)[0]) + "时";
				return temp;
			}
		case "metartemp":
			{
				let temp = code.split("/");
				return "温度" + temp[0] + "℃，露点" + temp[1] + "℃";
			}
		case "qnh":
			{
				return "修正海压" + Number(/\d{4}/.exec(code)[0]) + "hpa";
			}
		case "re":
			{
				let w = toTianQiXianXiang(code.substr(2,code.length));
				return "近时出现" + w;
			}
		case "rvr":
			{
				let rvr = /R\d{2}\w*\//.exec(code)[0].replace("R", "").replace("/", "") + "号跑道RVR";
				let v = /\/\S*/.exec(code)[0];
				switch (true) {
					case (/M/.test(v)):
						{
							rvr = rvr + "小于" + Number(/\d{4}/.exec(v)[0]) + "M";
							break;
						}
					case (/V/.test(v)):
						{
							let r1 = parseInt(/\d{4}V/.exec(v)) + "M";
							let r2 = parseInt(/V\d{4}/.exec(v)[0].replace("V", "")) + "M";
							rvr = rvr + "在" + r1 + "到" + r2 + "间变化"
							break;
						}
					case (/P/.test(v)):
						{
							rvr = rvr + "大于" + Number(/\d{4}/.exec(v)[0]) + "M";
							break;
						}
					default:
						{
							rvr = rvr + Number(/\d{4}/.exec(v)[0]) + "M";
							break;
						}
				}
				switch (v.substr(v.length - 1, 1)) {
					case "U":
						{
							rvr = rvr + "，正在上升";
							break;
						}
					case "N":
						{
							rvr = rvr + ",无变化趋势";
							break;
						}
					case "D":
						{
							rvr = rvr + ",正在下降";
							break;
						}
				}
				return rvr;
			}
		case "nosig":
			{
				return "无重大天气变化";
			}
	}
}
function toTianQiXianXiang(text) {
	let reg = new RegExp(/[A-Z]+/, "g"),
		weaReg = new RegExp("CAVOK|[A-Z]{2}|\\-|\\+", "g"),
		regResult,
		indexs = [],
		result = text;
	while ((regResult = reg.exec(result)) != null) {
		regResult;
		if (/[TSHRA]{2}/.test(regResult[0]))
			indexs.push(regResult['index']);
	}
	for (let i = indexs.length - 1; i >= 0; i--) {
		if (!/[\-\+]{1}/.test(result.substr(indexs[i] - 1, 1))) {
			result = result.slice(0, indexs[i]) + "中" + result.slice(indexs[i], result.length);
		}
	}
	indexs = [];
	while ((regResult = weaReg.exec(result)) != null) {
		regResult;
		indexs.push(regResult[0]);
	}
	for (let i in indexs) {
		result = result.replace(indexs[i], dict[indexs[i]]);
	}
	result = result.replace('强雨', '大雨');
	return result;
}
function getWind(wind) {
	let wd = wind.substr(0, 3); //风向
	let ws, gust;
	if (wind.substr(3, 1) === "P") {
		ws = wind.substr(3, 3); //风速	
	} else {
		ws = wind.substr(3, 2); //风速
	}
	if (wind.search("G") > 0) {
		let z = wind.indexOf("G") + 1;
		if (wind.substr(z, 1) === "P") {
			gust = wind.substr(z, 3); //风速	
		} else {
			gust = wind.substr(z, 2); //风速
		}
	} else {
		gust = "";
	}
	return [wd, ws, gust];
}

// module.export(){
// 	report2words
// }
