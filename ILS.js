
//Terrain Radar
let terrainPoints = [];
function getRadar(resolution) {
  if (terrainPoints.length > resolution) {
  terrainPoints = [];
  }
  for (let i = 0; i < 500; i++) {
    let distance = i/8 % 3;
    let directionStart = geofs.animation.values.heading
    let direction = directionStart - i /5
    let x1 = geofs.aircraft.instance.llaLocation[0];
    let y1 = geofs.aircraft.instance.llaLocation[1];
    let x2 = distance*Math.sin(Math.PI*direction/180);
    let y2 = distance*Math.cos(Math.PI*direction/180);
    terrainPoints.push([distance*100, Math.PI*((i/5  - 225)/180), geofs.getGroundAltitude([x1+(x2 * 1), y1+(y2 * 1)]).location[2]]);
  }
  
}

let toggleRadar = 0

function radar(){
if (toggleRadar == 0){
  toggleRadar = 1;
}
  else{
    toggleRadar = 0;
  }
}


//ILS program

function getDistance(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = deg2rad(lat2 - lat1);
  var dLon = deg2rad(lon2 - lon1);
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
    ;
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  var d = R * c;
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180)
}


function computeSlopeDeviation(ae, alt, alg, lt, lg, a) {
  let gradient = 0.05;
  let distance = getDistance(alt, alg, lt, lg) * 1000;
  let idealAltAtPos = ae + gradient * distance;
  let deviation = idealAltAtPos - a;
  return deviation;
}

//runway side detection from autoland 1.0

function getRwHeading() {
  if (Object.values(geofs.runways.nearRunways).length != 0){
  let defaultRunway = runway.heading;
  let aircraftHeading = geofs.animation.values.heading360

  if (aircraftHeading >= defaultRunway + 90 || aircraftHeading <= defaultRunway - 90) {
    let sideHeading = runway.heading + 180;
    let sideHeadingFixed = sideHeading % 360;
    return sideHeadingFixed;
  }
  else {
    return defaultRunway;
  }
  }
else {
return 0;
}
}

function getRwThreshold() {
  if (Object.values(geofs.runways.nearRunways).length != 0){
  let defaultRunway = runway.heading;
  let aircraftHeading = geofs.animation.values.heading;

  if (aircraftHeading >= defaultRunway + 90 || aircraftHeading <= defaultRunway - 90) {

    let x1 = runway.location[1];
    let y1 = runway.location[0];
    let x2 = runway.lengthInLla[1];
    let y2 = runway.lengthInLla[0];
    let runwayThresholdX = x1 + x2;
    let runwayThresholdY = y1 + y2;
    let runwayThreshold = [runwayThresholdY, runwayThresholdX, 0];
    return runwayThreshold;
  }

  else {
    let runwayThreshold = runway.location
    return runwayThreshold;
  }
  }
    else {
return [0,0];
    }
}




function radians(n) {
  return n * (Math.PI / 180);
}
function degrees(n) {
  return n * (180 / Math.PI);
}

//yes i know ive defined those functions like 3 times now but whatever lol


//main function to find the direction to the airport. a perfect localizer capture will mean that the runway heading - function output = 0.
function getBearing(a, b, c, d) {
  startLat = radians(c);
  startLong = radians(d);
  endLat = radians(a);
  endLong = radians(b);

  let dLong = endLong - startLong;

  let dPhi = Math.log(Math.tan(endLat / 2.0 + Math.PI / 4.0) / Math.tan(startLat / 2.0 + Math.PI / 4.0));
  if (Math.abs(dLong) > Math.PI) {
    if (dLong > 0.0)
      dLong = -(2.0 * Math.PI - dLong);
    else
      dLong = (2.0 * Math.PI + dLong);
  }

  return (degrees(Math.atan2(dLong, dPhi)) + 360.0) % 360.0;
}

function computeLocDeviation(alt, alg, lt, lg) {
  return getRwHeading() - getBearing(alt, alg, lt, lg);
}

function getNearestRunway() {
  return Object.values(geofs.runways.nearRunways)[minKey];
}

let runway = ""

function displayDeviations() {
    if (Object.values(geofs.runways.nearRunways).length != 0){
  a = getRwThreshold()
  b = geofs.aircraft.instance.llaLocation
  locdev = clamp(-computeLocDeviation(a[0], a[1], b[0], b[1]) * 20, -250, 250);
  gsdev = clamp(3 * computeSlopeDeviation(Object.values(geofs.api.flatRunwayTerrainProviderInstance.regions)[0].referenceElevation, a[0], a[1], b[0], b[1], (geofs.animation.values.altitudeMeters - 4)), -500, 500);
}
}
//ils display
let ilshead = 0; // will set this to geofs.animation.values.heading360 later
let locdev = 0;
let gsdev = 0;
let traffic = Object.values(multiplayer.visibleUsers)

class ILSsim {
  constructor(resX, resY, sizeX, sizeY) {
    // IMP VALUES ! NO CHANGE !!
    this.Values = {};
    this.Values.LocDev = 0;
    this.Values.GSDev = 0;
    this.Values.Heading = 0;

    // Everything Else LOL
    this.VisibilityToggleButton;
    this.Display = {};
    this.Display.Element;
    this.Display.Context;
    this.Display.Width = resX;
    this.Display.Height = resY;
    this.Display.SizeWidth = sizeX;
    this.Display.SizeHeight = sizeY;
    this.Events = [];
  }
  // Implement Show/Hide Canvas
  AssignVisibilityToggleButton(element) {
    this.VisibilityToggleButton = element;
    let self = this;
    this.VisibilityToggleButton.onclick = function() {
      if (this.innerText == "show") {
        self.Display.Element.style.visibility = "visible";
        this.innerText = "hide";
      } else {
        self.Display.Element.style.visibility = "hidden";
        this.innerText = "show";
      }
    };
  }
  MakeLine(color, x1, y1, x2, y2) {
    this.Display.Context.beginPath();
    this.Display.Context.strokeStyle = color;
    this.Display.Context.moveTo(x1, y1);
    this.Display.Context.lineTo(x2, y2);
    this.Display.Context.stroke();
  }
  MakeText(text, color, x, y, font) {
    this.Display.Context.beginPath();
    let prevColor = this.Display.Context.fillStyle;
    let prevFont = this.Display.Context.font;
    this.Display.Context.beginPath();
    this.Display.Context.fillStyle = color;
    if (font) {
      this.Display.Context.font = font;
    }
    this.Display.Context.fillText(text, x, y);
    this.Display.Context.fillStyle = prevColor;
    this.Display.Context.font = prevFont;
  }
  // Non-Interactive Rectangle Making.
  MakeRect(fill, color, x, y, width, height) {
    this.Display.Context.beginPath();
    this.Display.Context.strokeStyle = color;
    this.Display.Context.rect(x, y, width, height);
    this.Display.Context.stroke();
    this.Display.Context.fillStyle = fill;
    this.Display.Context.fill();
  }
  // Interactive Rectangle Making.
  MakePolygon(points, fillColor, outlineColor, onclick) {
    if (onclick) {
      this.AddEventToCanvas(points, onclick);
    }
    this.Display.Context.beginPath();
    this.Display.Context.moveTo(points[0][0], points[0][1]);
    points = points.slice(1);
    let a;
    for (a of points) {
      let x = a[0];
      let y = a[1];
      this.Display.Context.lineTo(x, y);
    }
    this.Display.Context.fillStyle = fillColor;
    this.Display.Context.fill();
    this.Display.Context.strokeStyle = outlineColor;
    this.Display.Context.stroke();
  }
  MakeCircle(fillColor, strokeColor, x, y, r, startAngle, endAngle, antiClockwise) {
    this.Display.Context.beginPath();
    if (startAngle) {
      this.Display.Context.arc(x, y, startAngle, endAngle, antiClockwise);
    } else {
      this.Display.Context.arc(x, y, r, 0, 2 * Math.PI);
    }
    this.Display.Context.strokeStyle = strokeColor;
    this.Display.Context.stroke();
    this.Display.Context.fillStyle = fillColor;
    this.Display.Context.fill();
  }
  MakeRoundSlider(x, y, r, value, color1, color2, color3, color4, color5, color6, mouseMoveFunction, mouseUpFunction) {
    let extractedValue = this.Values[value];
    let direction = 360 / 100 * extractedValue;
    direction -= 90;
    this.MakeCircle(color2, color1, x, y, r);
    this.MakeCircle(color4, color3, x, y, r * 0.5);
    this.MakePolygon([
      [x + (Math.cos(A2R(direction + 90)) * -1), y + (Math.sin(A2R(direction + 90)) * -1)],
      [x + (Math.cos(A2R(direction + 90)) * 1), y + (Math.sin(A2R(direction + 90)) * 1)],
      [x + (Math.cos(A2R(direction + 90)) * 1) + (Math.cos(A2R(direction)) * r), y + (Math.sin(A2R(direction + 90)) * 1) + (Math.sin(A2R(direction)) * r)],
      [x + (Math.cos(A2R(direction + 90)) * -1) + (Math.cos(A2R(direction)) * r), y + (Math.sin(A2R(direction + 90)) * -1) + (Math.sin(A2R(direction)) * r)]
    ], color6, color5, function(a) {
      a.path[0].onmouseup = function(b) {
        mouseUpFunction(b);
        b.path[0].onmousemove = undefined;
      };
      a.path[0].onmousemove = function(b) {
        mouseMoveFunction(b);
      };
    });
  }
  AddEventToCanvas(points, func) {
    let newObj = { "points": points, "func": func };
    this.Events[this.Events.length] = newObj;
  }
  RemoveEventFromCanvas(event) {
    let index = this.Events.indexOf(event);
    if (index > -1) {
      this.Events.splice(index, 1);
    }
  }
  ResetEvents() {
    this.Events.length = 0;
  }
  SetupEventHandler() {
    let self = this;
    this.Display.Element.onmousedown = function(event) {
      let rect = event.target.getBoundingClientRect();
      let xRelation = self.Display.Width / self.Display.SizeWidth.slice(0, self.Display.SizeWidth.length - 2);
      let yRelation = self.Display.Height / self.Display.SizeHeight.slice(0, self.Display.SizeHeight.length - 2);
      let x = event.clientX - rect.left;
      let y = event.clientY - rect.top;
      x *= xRelation;
      y *= yRelation;
      console.log("X: " + x + "\nY: " + y);
      console.log(event);
      let a;
      for (a of self.Events) {
        let func = a.func;
        let vs = a.points;
        if (inside([x, y], vs)) {
          func(event);
          self.ResetEvents();
        }
      }
      self.rDraw();
    };
  }
  SetupCanvas() {
    this.Display.Element = document.createElement("canvas");
    this.Display.Element.width = this.Display.Width;
    this.Display.Element.height = this.Display.Height;
    this.Display.Element.style.width = this.Display.SizeWidth;
    this.Display.Element.style.height = this.Display.SizeHeight;
    this.Display.Element.style.position = "absolute";
    this.Display.Element.style.left = "25%";
    this.Display.Element.style.top = "25%";
    this.Display.Element.style.transform = "translate(-50%, -50%)";
    this.Display.Element.style.imageRendering = "pixelated";
    document.body.appendChild(this.Display.Element);
    this.Display.Context = this.Display.Element.getContext("2d");
    this.Display.Context.lineWidth = 10;
  }
  rDraw() {
    let w = this.Display.Width;
    let h = this.Display.Height;
    this.Display.Context.clearRect(0, 0, w, h)
    this.Draw();
  }
  Draw() {
    function getDeviation() {
      let b = ilshead
      let a = Math.PI * (b / 180);
      let d = locdev;
      let c1 = Math.sin(Math.PI * (heading / 180)) * 100;
      let c2 = Math.cos(Math.PI * (heading / 180)) * 100;
      let c3 = Math.PI * (b + 90) / 180;
      let origin = [w - w / 1.9, h - h / 2];
      let x1 = origin[0] + d * Math.sin(c3);
      let y1 = origin[1] - d * Math.cos(c3);
      let x2 = origin[0] + c1 + (d * Math.sin(c3));
      let y2 = origin[1] - c2 - (d * Math.cos(c3));
      // console.log([x1, y1, x2, y2, c3]); //For debugging
      return [x1, y1, x2, y2];
    }

    function getTrafficIndicator(direction, distance) {
      let directionRad = Math.PI * (direction / 180);
      let origin = [w - w / 1.9, h - h / 2];
      let x1 = origin[0] + distance * Math.sin(directionRad);
      let y1 = origin[1] + distance * Math.cos(directionRad);
      return [x1, y1];
    }

    let heading = ilshead;
    let w = this.Display.Width;
    let h = this.Display.Height;
    this.MakeRect("black", "black", 0, 0, w, h);
    this.MakeCircle("white", "white", w - w / 1.9, h - h / 2, 300);
    this.MakeCircle("black", "white", w - w / 1.9, h - h / 2, 295);
    //heading lines
    this.MakeLine("#e600ff", w - w / 1.9, h - h / 2, w - w / 1.9 + Math.sin(Math.PI * (heading / 180)) * 300, h - h / 2 - Math.cos(Math.PI * (heading / 180)) * 300);
    this.MakeLine("#e600ff", w - w / 1.9, h - h / 2, w - w / 1.9 - Math.sin(Math.PI * (heading / 180)) * 300, h - h / 2 + Math.cos(Math.PI * (heading / 180)) * 300);
    this.MakeCircle("black", "black", w - w / 1.9, h - h / 2, 100);
    //terrain radar
    if (toggleRadar == 1) {
    terrainPoints.forEach(function(e){
      let elevation = geofs.animation.values.altitudeMeters;
      if (e[2] < elevation - 1000){
      display.MakeCircle("green", "#ffffff00", w - w / 1.9 +e[0]*Math.sin(e[1]), h - h / 2 + e[0]*Math.cos(e[1]), Math.abs(1+e[0]/20));
      }
      if (e[2] > elevation - 1000 && e[2] < elevation){
        display.MakeCircle("yellow", "#ffffff00", w - w / 1.9 +e[0]*Math.sin(e[1]), h - h / 2 + e[0]*Math.cos(e[1]), Math.abs(1+e[0]/20));
      }
      if (e[2] > elevation) {
        display.MakeCircle("red", "#ffffff00", w - w / 1.9 +e[0]*Math.sin(e[1]), h - h / 2 + e[0]*Math.cos(e[1]), Math.abs(1+e[0]/20));
      }
    })
    }
    //traffic
    traffic.forEach(function(e) {
      display.MakeCircle("black", "blue", getTrafficIndicator(geofs.animation.values.heading+getBearing(e.referencePoint.lla[0], e.referencePoint.lla[1], geofs.aircraft.instance.llaLocation[0], geofs.aircraft.instance.llaLocation[1]), e.distance / 100)[0], getTrafficIndicator(geofs.animation.values.heading+getBearing(e.referencePoint.lla[0], e.referencePoint.lla[1], geofs.aircraft.instance.llaLocation[0], geofs.aircraft.instance.llaLocation[1]), e.distance / 100)[1], 5)
    })
    //aircraft indicator
    this.MakeLine("yellow", w - w / 1.9, h - h / 2 + 20, w - w / 1.9 + 60, h - h / 2 + 20);
    this.MakeLine("yellow", w - w / 1.9, h - h / 2 + 20, w - w / 1.9 - 60, h - h / 2 + 20);
    this.MakeLine("yellow", w - w / 1.9, h - h / 2, w - w / 1.9, h - h / 2 + 100);
    this.MakeLine("yellow", w - w / 1.9, h - h / 2, w - w / 1.9, h - h / 2 - 20);
    this.MakeLine("yellow", w - w / 1.9, h - h / 2 + 75, w - w / 1.9 + 25, h - h / 2 + 75);
    this.MakeLine("yellow", w - w / 1.9, h - h / 2 + 75, w - w / 1.9 - 25, h - h / 2 + 75);
    // gs indicator
    this.MakeCircle("black", "#e600ff", w - w / 15, (h - h / 2 + 7) - gsdev, 20);
    //gs deviation markers
    this.MakeRect("yellow", "yellow", w - w / 10, h - h / 2, w / 15, h / 100);
    this.MakeCircle("white", "white", w - w / 15, h - h / 1.5, 15);
    this.MakeCircle("black", "white", w - w / 15, h - h / 1.5, 8);
    this.MakeCircle("white", "white", w - w / 15, h - h / 1.2, 15);
    this.MakeCircle("black", "white", w - w / 15, h - h / 1.2, 8);
    this.MakeCircle("white", "white", w - w / 15, h - h / 3.25, 15);
    this.MakeCircle("black", "white", w - w / 15, h - h / 3.25, 8);
    this.MakeCircle("white", "white", w - w / 15, h - h / 6.5, 15);
    this.MakeCircle("black", "white", w - w / 15, h - h / 6.5, 8);
    //loc deviation markers
    this.MakeCircle("black", "white", w - w / 1.9 - Math.cos(Math.PI * (heading / 180)) * 75, h - h / 2 - Math.sin(Math.PI * (heading / 180)) * 75, 8);
    this.MakeCircle("black", "white", w - w / 1.9 - Math.cos(Math.PI * (heading / 180)) * 200, h - h / 2 - Math.sin(Math.PI * (heading / 180)) * 200, 8);
    this.MakeCircle("black", "white", w - w / 1.9 + Math.cos(Math.PI * (heading / 180)) * 75, h - h / 2 + Math.sin(Math.PI * (heading / 180)) * 75, 8);
    this.MakeCircle("black", "white", w - w / 1.9 + Math.cos(Math.PI * (heading / 180)) * 200, h - h / 2 + Math.sin(Math.PI * (heading / 180)) * 200, 8);
    this.MakeLine("#e600ff", getDeviation()[0], getDeviation()[1], getDeviation()[2], getDeviation()[3]);
    
  };

}

let display
let rwDistances = [];
let minKey = 0;

function ilsIntervalStart() {
ilsInterval = setInterval(function() {
  rwDistances = []
  Object.values(geofs.runways.nearRunways).forEach(function(e){
rwDistances.push(getDistance(e.location[0], e.location[1], geofs.aircraft.instance.llaLocation[0], geofs.aircraft.instance.llaLocation[1]));
})
  rwDistances.forEach(function(e, i){
    if (e == Math.min(...rwDistances)) {
      minKey = i;
    }
  })
      ;
  traffic = Object.values(multiplayer.visibleUsers);
  runway = getNearestRunway();
  ilshead = getRwHeading() - geofs.animation.values.heading360;
  displayDeviations()
  display.rDraw()
}, 200)
};


let terrainInterval = setInterval(function(){
  getRadar(100)
}, 1000)

let array = []

function destroyDisplays() {
  array = []
  Object.values(document.getElementsByTagName("canvas")).forEach(function(e){if (e.width == 1000) array.push(e)})
  array.forEach(function(e){e.remove()})
}

let hide = false
function togglePanel(){
  if (!hide){
 display = new ILSsim(1000, 1000, "250px", "250px");
display.SetupCanvas();
display.SetupEventHandler();
display.Draw();
    ilsIntervalStart()
  hide = true;
  }
  else {
    destroyDisplays()
    hide = false;
  }
};

// Panel Code
let ilspanel = document.createElement("div");
ilspanel.innerHTML = '<ul class="geofs-list geofs-toggle-panel geofs-autoland-list geofs-preferences" data-noblur="true" data-onshow="{geofs.initializePreferencesPanel()}" data-onhide="{geofs.savePreferencesPanel()}"><style>#MainDIV {position: absolute;left: 0px;top: 0px;background-color: white;border: 5px solid #000000;text-align: center;padding: 0px 10px 10px 10px;}#DIVtitle {color: black;font-family: monospace;font-weight: bold;font-size: 20px;}p {color: black;font-family: monospace;font-weight: bold;}.button {display: inline-block;padding: 3px 24px;font-size: 15px;cursor: pointer;text-align: center;text-decoration: none;outline: none;color: black;background-color: #ffc107;border: none;border-radius: 1px;box-shadow: 0 0px #999;}.button2 {display: inline-block}.button:hover {background-color: #536dfe}.button:active {opacity: 0.6;}.button3 {display: inline-block;padding: 3px 24px;font-size: 15px;cursor: pointer;text-align: center;text-decoration: none;outline: none;color: #fff;background-color: #536dfe;border: none;border-radius: 1px;box-shadow: 0 0px #999;}.button4 {display: inline-block;padding: 3px 24px;font-size: 15px;cursor: pointer;text-align: center;text-decoration: none;outline: none;color: #fff;background-color: red;border: none;border-radius: 1px;box-shadow: 0 0px #999;}</style><div id="MainDIV"><p id="DIVtitle">ILS Interface</p><p>ILS Interface:</p><button class = "button" onclick = "togglePanel()">Toggle ILS panel</button><button class = "button" onclick = "radar()">Toggle Terrain Radar</button></div></ul>'

let sidePanel = document.getElementsByClassName("geofs-ui-left")[0]
document.getElementsByClassName("geofs-ui-left")[0].appendChild(ilspanel)

// Toggle Button Code
let buttonDiv = document.createElement("div");
buttonDiv.innerHTML = '<button class="mdl-button mdl-js-button geofs-f-standard-ui geofs-mediumScreenOnly" data-toggle-panel=".geofs-autoland-list" data-tooltip-classname="mdl-tooltip--top" id="ilsbutton" tabindex="0" data-upgraded=",MaterialButton">ILS</button>'
document.body.appendChild(buttonDiv);
document.getElementsByClassName("geofs-ui-bottom")[0].appendChild(buttonDiv);
let element = document.getElementById("ilsbutton");
document.getElementsByClassName("geofs-ui-bottom")[0].insertBefore(element, buttonDiv);
