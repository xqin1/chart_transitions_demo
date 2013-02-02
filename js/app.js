// to all the transition functions 
var paddingBottom = 20,
    width = 880,
    height = 600 - paddingBottom,
    duration = 750;

// the domain of our scales will be set
// once we have loaded the data
var x = d3.time.scale()
          .range([0, width]);

var y = d3.scale.linear()
          .range([height, 0]);

var color = d3.scale.category10();

// area generator to create the
// polygons that make up the
// charts
var area = d3.svg.area()
            .interpolate("basis")
            .x(function(d){return x(d.date)});

// line generator to be used
// for the Area Chart edges
var line = d3.svg.line()
    .interpolate("basis")
    .x(function(d){return x(d.date)});

// stack layout for streamgraph
// and stacked area chart
var stack = d3.layout.stack()
      .values(function(d){return d.values})
      .x(function(d){return d.date})
      .y(function(d){return d.count})
      .out(function(d,y0,y){return d.count0 = y0})
      .order("reverse");

// axis to simplify the construction of
// the day lines
var xAxis = d3.svg.axis()
              .scale(x)
              .tickSize(-height)
              .tickFormat(d3.time.format('%a %d'));

// we will populate this variable with our
// data array, once its been loaded
var data = null;

// Create the blank SVG the visualization will live in.
var svg = d3.select("#vis").append("svg")
          .attr("width", width)
          .attr("height", height + paddingBottom);

// ---
// Called when the chart buttons are clicked.
// Hands off the transitioning to a new chart
// to separate functions, based on which button
// was clicked. 
// ---
function transitionTo(name){
  if (name == "stream"){streamgraph()};
  if (name == "stack"){stackedAreas()};
  if (name == "area"){areas()};
}
// ---
// This is our initial setup function.
// Here we setup our scales and create the
// elements that will hold our chart elements.
// ---
function start(){
  // first, lets setup our x scale domain
  // this assumes that the dates in our data are in order
  var minDate = d3.min(data, function(d){return d.values[0].date});
  var maxDate = d3.max(data, function(d){return d.values[d.values.length - 1].date});
  x.domain([minDate, maxDate])

  // D3's axis functionality usually works great
  // however, I was having some aesthetic issues
  // with the tick placement
  // here I extract out every other day - and 
  // manually specify these values as the tick 
  // values
  var dates = data[0].values.map(function(v){return v.date});
  var index = 0;
  dates = dates.filter(function(d){
                           index += 1;
                          return (index % 2) == 0;});

  xAxis.tickValues(dates);

  // the axis lines will go behind
  // the rest of the display, so create
  // it first
  svg.append("g")
    .attr("class", "x axis")
    .attr("transform", "translate(0," + height + ")")
    .call(xAxis)

  // I want the streamgraph to emanate from the
  // middle of the chart. 
  // we can set the area's y0 and y1 values to 
  // constants to achieve this effect.
  area.y0(height / 2)
    .y1(height / 2);

  // now we bind our data to create
  // a new group for each request type
  g = svg.selectAll(".request")
    .data(data)
    .enter();

  requests = g.append("g")
    .attr("class", "request");

  // add some paths that will
  // be used to display the lines and
  // areas that make up the charts
  requests.append("path")
    .attr("class", "area")
    .style("fill", function(d){return color(d.key)})
    .attr("d", function(d){return area(d.values)});

  requests.append("path")
    .attr("class", "line")
    .style("stroke-opacity", 1e-6);

  // create the legend on the side of the page
  createLegend();

  // default to streamgraph display
  streamgraph();
}
// ---
// Code to transition to streamgraph.
//
// For each of these chart transition functions, 
// we first reset any shared scales and layouts,
// then recompute any variables that might get
// modified in other charts. Finally, we create
// the transition that switches the visualization
// to the new display.
// ---
function streamgraph(){
  // 'wiggle' is the offset to use 
  // for streamgraphs.
  stack.offset("wiggle");

  // the stack layout will set the count0 attribute
  // of our data
  stack(data);

  // reset our y domain and range so that it 
  // accommodates the highest value + offset
  y.domain([0, d3.max(data[0].values.map(function(d){return d.count0 + d.count}))])
    .range([height, 0]);

  // the line will be placed along the 
  // baseline of the streams, but will
  // be faded away by the transition below.
  // this positioning is just for smooth transitioning
  // from the area chart
  line.y(function(d){return y(d.count0)});

  // setup the area generator to utilize
  // the count0 values created from the stack
  // layout
  area.y0(function(d){return y(d.count0)})
    .y1(function(d){return y(d.count0 + d.count)});

  // here we create the transition
  // and modify the area and line for
  // each request group through postselection
  var t = svg.selectAll(".request")
    .transition()
    .duration(duration);
 
  // D3 will take care of the details of transitioning
  // between the current state of the elements and
  // this new line path and opacity.
  t.select("path.area")
    .style("fill-opacity", 1.0)
    .attr("d", function(d){return area(d.values)})

  // 1e-6 is the smallest number in JS that
  // won't get converted to scientific notation. 
  // as scientific notation is not supported by CSS,
  // we need to use this as the low value so that the 
  // line doesn't reappear due to an invalid number.
  t.select("path.line")
    .style("stroke-opacity", 1e-6)
    .attr("d", function(d){return line(d.values)})
}
// ---
// Code to transition to Stacked Area chart.
//
// Again, like in the streamgraph function,
// we use the stack layout to manage
// the layout details.
// ---
function stackedAreas(){
  // the offset is the only thing we need to 
  // change on our stack layout to have a completely
  // different type of chart!
  stack.offset("zero");
  // re-run the layout on the data to modify the count0
  // values
  stack(data);

  // the rest of this is the same as the streamgraph - but
  // because the count0 values are now set for stacking, 
  // we will get a Stacked Area chart.
  y.domain([0, d3.max(data[0].values.map(function(d){return d.count0 + d.count}))])
    .range([height, 0]);

  line.y(function(d){return y(d.count0)});

  area.y0(function(d){return y(d.count0)})
    .y1(function(d){return y(d.count0 + d.count)});

  var t = svg.selectAll(".request")
    .transition()
    .duration(duration);

  t.select("path.area")
    .style("fill-opacity", 1.0)
    .attr("d", function(d){return area(d.values)});

  t.select("path.line")
    .style("stroke-opacity", 1e-6)
    .attr("d", function(d){return line(d.values)});
}
// ---
// Code to transition to Area chart.
// ---
function areas(){
  var g = svg.selectAll(".request");

  // set the starting position of the border
  // line to be on the top part of the areas.
  // then it is immediately hidden so that it
  // can fade in during the transition below
  line.y(function(d){return y(d.count0 + d.count)})
  g.select("path.line")
    .attr("d", function(d){return line(d.values)})
    .style("stroke-opacity", 1e-6)

 
  // as there is no stacking in this chart, the maximum
  // value of the input domain is simply the maximum count value,
  // which we precomputed in the display function 
  y.domain([0, d3.max(data.map(function(d){return d.maxCount}))])
    .range([height, 0])

  // the baseline of this chart will always
  // be at the bottom of the display, so we
  // can set y0 to a constant.
  area.y0(height)
    .y1(function(d){return y(d.count)})

  line.y(function(d){return y(d.count)})

  var t = g.transition()
    .duration(duration)

  // transition the areas to be 
  // partially transparent so that the
  // overlap is better understood.
  t.select("path.area")
    .style("fill-opacity", 0.5)
    .attr("d", function(d){return area(d.values)})

  // here we finally show the line 
  // that serves as a nice border at the
  // top of our areas
  t.select("path.line")
    .style("stroke-opacity", 1)
    .attr("d", function(d){return line(d.values)})
}
// ---
// Called on legend mouse over. Shows the legend
// ---
function showLegend(){
  d3.select(".panel")
    .transition()
    .duration(500)
    .attr("transform", "translate(0,0)")
}
// ---
// Called on legend mouse out. Hides the legend
// ---
function hideLegend(){
  d3.select(".panel")
    .transition()
    .duration(500)
    .attr("transform", "translate(165,0)")
}
// ---
// Helper function that creates the 
// legend sidebar.
// ---
function createLegend(){
  var legendWidth = 200,
      legendHeight = 245;
  var legend = d3.select("#legend").append("svg")
    .attr("width", legendWidth)
    .attr("height", legendHeight)

  var legendG = legend.append("g")
    .attr("transform", "translate(165,0)")
    .attr("class", "panel")

  legendG.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill-opacity", 0.5)
    .attr("fill", "white")

  legendG.on("mouseover", function(d,i){return showLegend()})
    .on("mouseout", function(d,i){return hideLegend()})

  var keys = legendG.selectAll("g")
    .data(data)
    .enter().append("g")
    .attr("transform", function(d,i){
            var y=10 + 40*i;
            return "translate(5," + y + ")";})
  keys.append("rect")
    .attr("width", 30)
    .attr("height", 30)
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("fill", function(d){return color(d.key)})

  keys.append("text")
    .text(function(d){return d.key})
    .attr("text-anchor", "left")
    .attr("dx", "2.3em")
    .attr("dy", "1.3em")
}  
// ---
// Function that is called when data is loaded
// Here we will clean up the raw data as necessary
// and then call start() to create the baseline 
// visualization framework.
// ---
function display(error, rawData){
  // a quick way to manually select which calls to display. 
  // feel free to pick other keys and explore the less frequent call types.
  var filterer = {"Heating": 1, "Damaged tree": 1, "Noise": 1, "Traffic signal condition": 1, "General construction":1, "Street light condition":1};
  data = rawData.filter(function(d){return filterer[d.key] == 1})

  // a parser to convert our date string into a JS time object.
  var parseTime = d3.time.format.utc("%x").parse

  // go through each data entry and set its
  // date and count property
  data.forEach(function(s){
                s.values.forEach(function(d){
                    d.date = parseTime(d.date)
                    d.count = parseFloat(d.count)
                });
    // precompute the largest count value for each request type
                s.maxCount = d3.max(s.values, function(d){return d.count})
            });

  data.sort(function(a,b){return b.maxCount - a.maxCount});

  start();
}

// Document is ready, lets go!
$(document).ready(function() {
 // code to trigger a transition when one of the chart
 // buttons is clicked
  d3.selectAll(".switch")
    .on("click", function(d){
        d3.event.preventDefault()
        id = d3.select(this).attr("id")
        transitionTo(id)
      });

  // load the data and call 'display'
  d3.json("data/requests.json", display);
});

