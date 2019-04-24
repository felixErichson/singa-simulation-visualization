const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;



let tooltip = d3.select("body").append("div")
    .attr("class", "nodeTooltip")
    .style("opacity", 0);

let dragedTime;
let slideControl;
let dragedTimeLabel;
let xTimeScale;
let concentrationRange;
let svgSlider;
let moving = false;
let timer;
let comp;
let spec;
let legendSvg;

function setHeatmapDropdown() {

    d3.select(".loader").remove();


    d3.select("#heatmap-view-species-selection")
        .append("div")
        .attr("class", "btn-group")
        .attr("id", "heatmap_dropdown")
        .style("margin-top", "5px")
        .style("margin-left", "30%")
        .style("position", "relative")
        .append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary dropdown-toogle")
        .attr("id", "dropdown_button")
        .attr("data-toggle", "dropdown")
        .attr("aria-haspopup", "true")
        .attr("aria-expanded", "false")
        .text("select species");

    d3.select("#heatmap_dropdown")
        .append("div")
        .attr("class", "dropdown-menu")
        .attr("id", "heat_menu");

    for (let i in allSpecies) {
        d3.select("#heat_menu")
            .append("a")
            .attr("class", "dropdown-item")
            .attr("id", i)
            .text(allSpecies[i])
            .on("click", function () {
                let clickedSpeciesText = $(this).text();
                onClickHeatmapDropdown(clickedSpeciesText);
            })
    }
}

function onClickHeatmapDropdown(clickedSpeciesText) {
    $("#dropdown_button").text("species: " + clickedSpeciesText);
    d3.selectAll('#trajectory-view-heatmap svg').remove();
    d3.select("#play-button").remove();
    d3.selectAll('#heatmap-view-slider svg').remove();
    const selector = ".nav.nav-tabs.justify-content-center";

    $(selector).removeClass("invisible");
    $(selector).toggleClass("visible");

    setHeatmapRange();
    setHeatMapSvg();
    appendPlayButton();
    drawSilder(clickedSpeciesText);
    clearHtmlTags();
}

function appendPlayButton() {

    d3.select("#heatmap-view-slider")
        .append("button")
        .attr("id", "play-button")
        .attr("class", "btn btn-primary")
        .append("i")
        .attr("class","fas fa-play");


    playButton = d3.select("#play-button")
}


function initializeSlider(species) {

    let compartment = getCompartmentFromSpecies(species);
    concentrationRange = getRangeOfSpecies(species, compartment);
    spec = species;
    comp = compartment;
    dragedTime = time[0];
    svgSlider = d3.select("#heatmap-view-slider")
        .append("svg")
        .attr("style", "margin-left: 20%")
        .attr("width", widthSlider + marginSlider.left + marginSlider.right)
        .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

    getHeatmapData(dragedTime, compartment, species);
    getVesicleData(dragedTime,compartment,species);
    heatmapColor = setHeatmapColor(heatmapData.concat(vesicleData));
    //vesicleColor = setHeatmapColor(vesicleData);
    drawHeatmapRectangles(dragedTime,species);

    xTimeScale = d3.scaleLinear()
        .domain([0, time.length - 1])
        .range([0, widthSlider])
        .clamp(true);

}

function drawTrack(slider, compartment, species) {
    slider.append("line")
        .attr("class", "track")
        .attr("x1", xTimeScale.range()[0])
        .attr("x2", xTimeScale.range()[1])
        .select(function () {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "track-inset")
        .select(function () {
            return this.parentNode.appendChild(this.cloneNode(true));
        })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function () {
                slider.interrupt();
            })
            .on("start drag", function () {
                dragedTime = Math.trunc(xTimeScale.invert(d3.event.x));
                update(dragedTime, compartment, species);

            })
        );
}

function drawTrackOverlay(slider) {
    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 10 + ")")
        .selectAll("text")
        .data(xTimeScale.ticks(10))
        .enter()
        .append("text")
        .attr("x", xTimeScale)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d3.format(".0f")(time[d])
        });

    slideControl = slider.insert("circle", ".track-overlay")
        .attr("class", "slideControl")
        .attr("r", 9);

    dragedTimeLabel = slider.append("text")
        .attr("class", "label333")
        .attr("text-anchor", "middle")
        .text(time[0])
        .attr("transform", "translate(0," + (-25) + ")");
}

function drawSilder(species) {

    let compartment = getCompartmentFromSpecies(species);

    initializeSlider(species);
    dragedTime = 0;
    let slider =
        svgSlider
            .append("g")
            .attr("class", "slider")
            .attr("transform", "translate(" + marginSlider.left + "," + heightSlider / 3 + ")");


    drawTrack(slider, compartment, species);
    drawTrackOverlay(slider);

    playButton
        .on("click", function () {
            let button = d3.select(this);
            if (button.select("i").attr("class") === "fas fa-pause") {
                moving = false;
                clearInterval(timer);
                // timer = 0;
                button.select("i").attr("class", "fas fa-play");
            } else {
                moving = true;
                timer = setInterval("step()", 10);
                //console.log(timer);
                button.select("i").attr("class", "fas fa-pause");
                //button.text("Pause");
            }
        });
}

function step() {
    update(dragedTime, comp, spec);
    dragedTime = dragedTime + (5);
    // console.log(dragedTime);
    if (dragedTime > time.length - 1) {
        moving = false;
        dragedTime = 0;
        clearInterval(timer);
        playButton.select("i").attr("class", "fas fa-play");
    }
}

function update(h, compartment, species) {

    slideControl.attr("cx", xTimeScale(h));

    dragedTimeLabel.attr("x", xTimeScale(h))
        .text(d3.format(".3f")(time[h]));

    getHeatmapData(time[h], compartment, species);
    getVesicleData(time[h], compartment, species);
    heatmapColor = setHeatmapColor(heatmapData.concat(vesicleData));
    //vesicleColor = setHeatmapColor(vesicleData);
    drawHeatmapRectangles(time[h], species);
    relativeScaleAxis();
    absoluteScaleAxis();
    drawHeatmapLegend();

    d3.select("#menu-heatmap-data")
        .selectAll("p").remove();
    if (activeComponentIdices[0] !== undefined) {
        changeVerticalLineData(h);
    }
}

function setHeatmapRange() {

    nestedData.keys().forEach(function (timestep) {
        nestedData.get(timestep).keys().forEach(function (node) {
            if (!heatmapXRange.includes(node.split(regEx)[1])) {
                heatmapXRange.push(node.split(regEx)[1]);
            }

            if (!heatmapYRange.includes(node.split(regEx)[2])) {
                heatmapYRange.push(node.split(regEx)[2]);
            }
        })
    });

    heatmapXRange.sort(function sortNumber(a, b) {
        return a - b;
    });

    heatmapYRange.sort(function sortNumber(a, b) {
        return a - b;
    });
}

function drawHeatmapLegend() {

    d3.select("#heatLEngend").html('');

    d3.select("#legend-traffic").remove();
    d3.select(".legendWrapper").remove();
    d3.select(".legendRect").remove();
    d3.select(".axislegend").remove();

   let linearGradient =  legendSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-traffic")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", "#f1ff7f");

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", "#0cac79");

    let legendWidth = Math.min(heatwidth, 450);

    let legendsvg = legendSvg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(0,10)");

    legendsvg.append("rect")
        .attr("class", "legendRect")
        .attr("x", 15)
        .attr("y", 0)
        //.attr("rx", hexRadius*1.25/2)
        .attr("width", legendWidth)
        .attr("height", 10)
        .style("fill", "url(#legend-traffic)");


    if ($('input[name="check"]:checked').val() === "relative") {
        relativeScaleAxis();
    } else {
        absoluteScaleAxis();
    }

    let xAxis = d3.axisBottom()
        .ticks(5)
        .scale(LegendAxisScale);

    legendsvg.append("g")
        .attr("class", "axislegend")
        .attr("transform", "translate(210,10)")
        .call(xAxis);
}

let LegendAxisScale;

function relativeScaleAxis() {

    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(d3.extent(heatmapData.concat(vesicleData), function (d) {
            if (d.value > -1){
                return d.value
            }
        }));
}

function absoluteScaleAxis() {
    let legendWidth = Math.min(heatwidth, 400);

    LegendAxisScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain(concentrationRange);


}

let vesicleData = [];

function getVesicleData(currentTimeStep, compartment, species) {

    vesicleData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        if (node.startsWith("v")) {
            if (nestedData.get(currentTimeStep).get(node).get(compartment) !== undefined) {
                if (nestedData.get(currentTimeStep).get(node).get(compartment).get(species) === undefined) {

                    obj = {
                        //  name: compartment+ "_" + species,
                       name: node,
                        value: 0
                    };
                    vesicleData.push(obj);
                } else {
                    obj = {
                        name: node,
                        value: nestedData.get(currentTimeStep).get(node).get(compartment).get(species)
                    };
                    vesicleData.push(obj);
                }

            } else {
                obj = {
                    //  name: compartment+ "_" + species,
                    name: node,
                    value: -1
                };
                vesicleData.push(obj);
            }
        }
    });


}

function getHeatmapData(currentTimeStep, compartment, species) {

    heatmapData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
        if (!node.startsWith("v")) {
            if (nestedData.get(currentTimeStep).get(node).get(compartment) !== undefined) {
                if (nestedData.get(currentTimeStep).get(node).get(compartment).get(species) === undefined) {

                    obj = {
                        //  name: compartment+ "_" + species,
                        x: node.split(regEx)[1],
                        y: node.split(regEx)[2],
                        value: 0
                    };
                    heatmapData.push(obj);
                } else {
                    obj = {
                        x: node.split(regEx)[1],
                        y: node.split(regEx)[2],
                        value: nestedData.get(currentTimeStep).get(node).get(compartment).get(species)
                    };
                    heatmapData.push(obj);
                }

            } else {
                obj = {
                    //  name: compartment+ "_" + species,
                    x: node.split(regEx)[1],
                    y: node.split(regEx)[2],
                    value: -1
                };
                heatmapData.push(obj);

            }
        }
    });
}

function getRangeOfSpecies(species, compartment) {
    let maxValue = 0.0;
    let minValue = Number.MAX_VALUE;
    nestedData.values().forEach(function (node) {
        node.values().forEach(function (currentSpecies) {
            if (currentSpecies.get(compartment) !== undefined) {
                if (maxValue < currentSpecies.get(compartment).get(species))
                    maxValue = currentSpecies.get(compartment).get(species);
                if (minValue > currentSpecies.get(compartment).get(species)) {
                    minValue = currentSpecies.get(compartment).get(species);
                }
            }
        })
    });
    return [minValue, maxValue];
}

function setHeatmapColor(data) {
    if ($('input[name="check"]:checked').val() === "relative") {

            return d3.scaleLinear()
                .range(["#ffffff","#f1ff7f","#0cac79"])
                .domain([-1,d3.min(data, function (d){
                    if (d.value > -1){
                        return d.value
                    }
                }),d3.max(data, function (d) {
                    if (d.value > -1){
                        return d.value
                    }
                })])

    } else {
        return d3.scaleLinear()
            .range(["#ffffff","#f1ff7f","#0cac79"])
            .domain([-1,concentrationRange[0], concentrationRange[1]])
    }
}



function setHeatMapSvg() {

    var zoom = d3.zoom()
        .scaleExtent([1, 10])
        .translateExtent([[-100, -100], [heatwidth + 90, heatheight + 100]])
        .on("zoom", zoomed);

    heatmapSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("width", 450)
        .attr("height", 450)
        .append("g")
        .attr("transform",
            "translate(15,25)")
        .attr("class", "PiYG")
        .call(zoom);

    legendSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("width", 450)
        .attr("height", 50)
        .attr("class", "heatLegend");



}

function zoomed() {
       heatmapSvg.attr("transform", d3.event.transform);
}


function drawHeatmapRectangles(currentTimeStep, species) {

    heatmapSvg.selectAll("path").remove();
    heatmapSvg.selectAll("circle").remove();

    let vertices = [];
    let vesiclePositions = [];

    let xScale;
    let yScale;

    vertices.length = 0;
    vesiclePositions.length = 0;


     xScale = d3.scaleLinear().domain([0, 1000]).range([0, 400]);
     yScale = d3.scaleLinear().domain([0, 1000]).range([0, 400]);

    nestedData.get(currentTimeStep).keys().forEach(function (node) {

        if (node.startsWith("n")) {
            let x = nestedData.get(currentTimeStep).get(node).get("x");
            let y = nestedData.get(currentTimeStep).get(node).get("y");

             vertices.push([xScale(x), yScale(y)]);

        } else {

            let x = nestedData.get(currentTimeStep).get(node).get("x");
            let y = nestedData.get(currentTimeStep).get(node).get("y");

            vesiclePositions.push([x, y]);
        }
    });

    var voronoi = d3.voronoi()
        .extent([[0, 0], [xScale(1000), yScale(1000)]]);

    var paths = heatmapSvg.selectAll("path")
        .data(voronoi(vertices).polygons())
        .enter().append("path")
        .attr("class", function (d, i) {
            return "path" + i
        })
        .attr("d", function (d) {
            return "M" + d.join("L") + "Z";
        })
        .on("click", function (d) {
            selectedNode = "n(" + d.x + "," + d.y + ")";
            drawGraphFromNode();
            getIndexIdentifier(getCompartmentFromSpecies(species), species);
            onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species), species));
            setChartTitle("Node (" + d.x + "," + d.y + ")");

        })
        .on("mouseover", function (d) {
            d3.select(this)
                .style("stroke", "black")
                .style("stroke-width", "1");
            mouseOverNode(this, d, species, currentTimeStep);

            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html('Node ('+ d.x + ',' + d.y +')' + "<br/>" +"value: " + d.value )
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");


        })
        .on("mouseleave", function () {
            d3.select(this)
                .style("stroke-width", "0");

            d3.select("#menu-heatmap-data")
                .selectAll("p").remove();

        tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    for (let i = 0; i < 100; i++) {

        d3.select(".path" + i)
            .datum(heatmapData[i])
            .style("fill", function (d) {
                return heatmapColor(d.value)
            });
    }

    for (let i in vesiclePositions){

            heatmapSvg.append("circle")
                .attr("id", "membrane" + i)
                .attr("cx", xScale(vesiclePositions[i][0]))
                .attr("cy", yScale(vesiclePositions[i][1]))
                .attr("r", 5)
                .style("stroke","black")
                .style("stroke-width","1px" )
                .style("fill", "white");

            heatmapSvg.append("circle")
                .attr("id", "lumen"+i)
                .attr("cx", xScale(vesiclePositions[i][0]))
                .attr("cy", yScale(vesiclePositions[i][1]))
                .attr("r", 3)
                .style("stroke","black")
                .style("stroke-width","1px" )
                .style("fill", "white");

            heatmapSvg.append("circle")
                .attr("id", "v"+i)
                .attr("cx", xScale(vesiclePositions[i][0]))
                .attr("cy", yScale(vesiclePositions[i][1]))
                .attr("r", 6)
                .style("fill", "black")
                .style("fill-opacity", "0.0")
                .on("click", function () {
                    selectedNode = "v"+i;
                    drawGraphFromNode();
                    setChartTitle("Vesicle " + i);
                    onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species), species));
    }).on("mouseover", function () {
        d3.select(this).style("stroke-width", "2px").style("stroke", "black");
                tooltip.transition()
                    .duration(200)
                    .style("opacity", .9);
                tooltip.html('Vesicle '+ i + "<br/>" +"value: " + vesicleData[i].value)
                    .style("left", (d3.event.pageX) + "px")
                    .style("top", (d3.event.pageY - 28) + "px");
            }).on("mouseleave", function () {
                d3.select(this).style("stroke-width", "0").style("stroke", "unset");
                tooltip.transition()
                    .duration(500)
                    .style("opacity", 0);

            })
    }

    for (let i = 0; i<10; i++){
        relativeScaleAxis(vesicleData);
        if(getCompartmentFromSpecies(species) === "vesicle membrane") {
            d3.select("#membrane" + i)
                .datum(vesicleData[i])
                .style("fill", function (d) {
                    return heatmapColor(d.value)
                });
        } else if (getCompartmentFromSpecies(species) === "vesicle lumen" ){

            d3.select("#lumen" + i)
                .datum(vesicleData[i])
                .style("fill", function (d) {
                    return heatmapColor(d.value)
                });
        }
    }


}

function mouseOverNode(currentNode, CurrentNodeObject, species, dragedTime) {

    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("Node (" + CurrentNodeObject.x + "," + CurrentNodeObject.y + ")");

    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("id", "showed_species")
        .attr("position", "absolute")
        .attr("bottom", "0");

    if (CurrentNodeObject.value === 0) {
        d3.select("#showed_species").text("species: nothing to find here")
    } else {
        d3.select("#showed_species").text("species: " + species)
    }

    let possibleCompartments = nestedData.get(dragedTime).get("n(" + CurrentNodeObject.x + "," + CurrentNodeObject.y + ")");

    if (possibleCompartments !== undefined) {
        possibleCompartments = possibleCompartments.keys();
    }


    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("id", "showed_species")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("possible nodeCompartments: " + possibleCompartments);


    d3.select("#menu-heatmap-data")
        .append("p")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("value: " + CurrentNodeObject.value)
}

function changeVerticalLineData(selectedTime) {

    d3.select(".trajectory.view.graph.verticalLine")
        .attr("x1", x(time[selectedTime]))
        .attr("x2", x(time[selectedTime]));

    let id1 = activeComponentIdices[0];
    let data = reducedNodeData[getCompartmentFromIndexIdentifier(id1) + "_" + getSpeciesFromIndexIdentifier(id1)];
    data = data[selectedTime];

    if (time[selectedTime] > time[time.length / 1.5]) {
        d3.selectAll(".trajectory.view.graph.verticalLine.valueLabel")
            .attr("x", -150)

    } else {

        d3.selectAll(".trajectory.view.graph.verticalLine.valueLabel")
            .attr("x", 0)
    }

    d3.select(".trajectory.view.graph.verticalLine.valueLabel.one")
        .datum(data)
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + scales[0](d.y) + ")";
        }).text(function (d) {
        return d.y;
    });

    d3.select(".trajectory.view.graph.verticalLine.circle")
        .datum(data)
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + scales[0](d.y) + ")";
        });


    if (activeComponentIdices[1] !== undefined) {

        let id2 = activeComponentIdices[1];
        let data2;

        data2 = reducedNodeData[getCompartmentFromIndexIdentifier(id2) + "_" + getSpeciesFromIndexIdentifier(id2)];
        data2 = data2[selectedTime];

        d3.select(".trajectory.view.graph.verticalLine.valueLabel.two")
            .datum(data2)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + scales[1](d.y) + ")";
            }).text(function (d) {
            return d.y;

        });

        d3.select(".trajectory.view.graph.verticalLine.circle2")
            .datum(data2)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + scales[1](d.y) + ")";
            })
    }
}

function setNodeCompartments() {
    nestedData.keys().forEach(function (timeStep) {
        nestedData.get(timeStep).get(selectedNode).keys().forEach(function (compartment) {
            if (!compartmentsOfSelectedNode.includes(compartment)&& !compartment.startsWith("x") && !compartment.startsWith("y")) {
                compartmentsOfSelectedNode.push(compartment)
            }
        })
    });
}

function drawGraphFromNode() {
    compartmentsOfSelectedNode.length = 0;
    activeComponentIdices.length = 0;
    setNodeCompartments();
    clearHtmlTags();
    sumCurrentNodeData();
    initializeMainContent();

}