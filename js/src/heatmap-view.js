const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;

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

function setHeatmapDropdown() {

    d3.select("#trajectory-view-heatmap")
        .append("div")
        .attr("class", "btn-group")
        .attr("id", "heatmap_dropdown")
        .style("trajectoryPlotMargin-top", "5px")
        .style("position", "relative")
        .append("button")
        .attr("type", "button")
        .attr("class", "btn btn-primary dropdown-toogle")
        .attr("id", "dropdown_button")
        .attr("data-toggle", "dropdown")
        .attr("aria-haspopup", "true")
        .attr("aria-expanded", "flase")
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
    d3.select("#heatmap-view-slider").html("");
    d3.selectAll('#heatmap-view-slider svg').remove();

    // setHeatmapRange();
    setHeatMapSvg();
    // appendPlayButton();
    // drawSilder(clickedSpeciesText);
    clearHtmlTags();
}

function appendPlayButton() {

    d3.select("#heatmap-view-slider")
        .append("button")
        .attr("id", "play-button")
        .attr("class", "btn btn-primary")
        .text("Play");

    playButton = d3.select("#play-button")
}


function initializeSlider(species) {
    concentrationRange = getRangeOfSpecies(species);
    let compartment = getCompartmentFromSpecies(species);

    spec = species;
    comp = compartment;


    dragedTime = time[0];

    svgSlider = d3.select("#heatmap-view-slider")
        .append("svg")
        .attr("style", "margin-left: 20%")
        .attr("width", widthSlider + marginSlider.left + marginSlider.right)
        .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

    getHeatmapData(dragedTime, compartment, species);
    heatmapColor = setHeatmapColor(compartment, species, concentrationRange);
    drawHeatmapRectangles(dragedTime, species);

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
            if (button.text() === "Pause") {
                moving = false;
                clearInterval(timer);
                // timer = 0;
                button.text("Play");
            } else {
                moving = true;
                timer = setInterval("step()", 100);
                console.log(timer);
                button.text("Pause");
            }
        });

}

function step() {
    update(dragedTime, comp, spec);
    dragedTime = dragedTime + (5);
    console.log(dragedTime);
    if (dragedTime > time.length - 1) {
        moving = false;
        dragedTime = 0;
        clearInterval(timer);
        playButton.text("Play");
    }
}

function update(h, compartment, species) {


    slideControl.attr("cx", xTimeScale(h));

    dragedTimeLabel.attr("x", xTimeScale(h))
        .text(d3.format(".3f")(time[h]));

    getHeatmapData(time[h], compartment, species);
    heatmapColor = setHeatmapColor(compartment, species, concentrationRange);
    drawHeatmapRectangles(time[h], species);
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

    d3.select("#legend-traffic").remove();
    d3.select(".legendRect").remove();
    d3.select(".axislegend").remove();

    let countScale = d3.scaleLinear()
        .domain([0, d3.max(heatmapData, function (d) {
            return d.value
        })])
        .range([0, heatwidth]);


//Calculate the variables for the temp gradient
    let numStops = 10;
    let countRange = countScale.domain();
    countRange[2] = countRange[1] - countRange[0];
    let countPoint = [];
    for (let i = 0; i < numStops; i++) {
        countPoint.push(i * countRange[2] / (numStops - 1) + countRange[0]);
    }

    heatmapSvg.append("defs")
        .append("linearGradient")
        .attr("id", "legend-traffic")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%")
        .selectAll("stop")
        .data(d3.range(numStops))
        .enter().append("stop")
        .attr("offset", function (d, i) {
            return countScale(countPoint[i]) / heatwidth;
        })
        .attr("stop-color", function (d, i) {
            return heatmapColor(countPoint[i])
        });

    let legendWidth = Math.min(heatwidth, 400);

    let legendsvg = heatmapSvg.append("g")
        .attr("class", "legendWrapper")
        .attr("transform", "translate(0,10)");

    legendsvg.append("rect")
        .attr("class", "legendRect")
        .attr("x", 0)
        .attr("y", 390)
        //.attr("rx", hexRadius*1.25/2)
        .attr("width", legendWidth)
        .attr("height", 10)
        .style("fill", "url(#legend-traffic)");

    let xScale = d3.scaleLinear()
        .range([-legendWidth / 2, legendWidth / 2])
        .domain([0, d3.max(heatmapData, function (d) {
            return d.value
        })]);

    let xAxis = d3.axisBottom()
        .ticks(5)
        .scale(xScale);

    legendsvg.append("g")
        .attr("class", "axislegend")
        .attr("transform", "translate(195,400)")
        .call(xAxis);
}

function getHeatmapData(currentTimeStep, compartment, species) {

    heatmapData.length = 0;
    let obj;

    nestedData.get(currentTimeStep).keys().forEach(function (node) {
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
                value: 0
            };
            heatmapData.push(obj);

        }

    });
}

function getRangeOfSpecies(species) {
    let maxValue = 0.0;
    let minValue = Number.MAX_VALUE;
    nestedData.values().forEach(function (node) {

        if (node.keys() !== "y" || node.keys() !== "x") {
            //console.log(node.values());
        }
        node.values().forEach(function (currentSpecies) {
            currentSpecies.values().forEach(function (currentValues) {
                currentValues.entries().forEach(function (currentEntry) {
                    if (currentEntry.key === species) {
                        if (maxValue < currentEntry.value)
                            maxValue = currentEntry.value;
                        if (minValue > currentEntry.value) {
                            minValue = currentEntry.value;
                        }
                    }
                })
            })
        })
    });
    return [minValue, maxValue];

}

function setHeatmapColor(compartment, species, concentrationRange) {

    if ($('input[name="check"]:checked').val() === "relative") {

        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain(d3.extent(heatmapData, function (d) {
                    return d.value
                })
            )
    } else {


        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain(concentrationRange)
    }
}

function setHeatMapSvg() {

    //TODO hier weitermachen Skalierung bearbeiten


   let xScale = d3.scaleLinear().domain([]).range([0,heatwidth]);
    let yScale = d3.scaleLinear().domain([vertices]).range([0,heatwidth]);

    heatmapSvg = d3.select("#trajectory-view-heatmap")
        .append("svg")
        .attr("width", 1000)
        .attr("height", 1000)
        .append("g")
        .attr("transform",
            "translate(30,10)")
        .attr("class", "PiYG");


    let vertices = [];
    let vesicle = [];

    nestedData.get("0.001").keys().forEach(function (node) {

        if(node.startsWith("n")){
            let x = nestedData.get("0.001").get(node).get("x");
            let y = nestedData.get("0.001").get(node).get("y");

            vertices.push([x,y]);

            heatmapSvg.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 3)
                .style("fill", "black")

        } else {

            let x = nestedData.get("0.001").get(node).get("x");
            let y = nestedData.get("0.001").get(node).get("y");

            vesicle.push([x,y]);

            heatmapSvg.append("circle")
                .attr("cx", x)
                .attr("cy", y)
                .attr("r", 6)
                .style("fill", "none")
                .style("stroke", "black")
                .style("stroke-with","2px")
        }

    });

    var voronoi = d3.voronoi()
        .extent([[0, 0], [1000, 1000]]);

    var paths = heatmapSvg.selectAll("path")
        .data(voronoi(vertices).polygons())
        .enter().append("path")
        .attr("d", function(d) {return "M" + d.join("L") + "Z";})
        .style("stroke", " black")
        .style("stroke-width", " 2px");

    heatmapSvg.selectAll("path")
        .data(voronoi(vertices).polygons())
        .enter().append("path")
        .attr("d", function(d) {return "M" + d.join("L") + "Z";})
        .style("stroke", " black")
        .style("stroke-width", " 2px");

    heatmapX = d3.scaleBand()
        .range([0, heatwidth])
        .domain(heatmapXRange)
        .padding(0.01);

    heatmapY = d3.scaleBand()
        .range([heatheight, 0])
        .domain(heatmapYRange)


}

function drawHeatmapRectangles(currentValue, species) {

    heatmapSvg.selectAll("rect").remove();

    heatmapSvg.selectAll()
        .data(heatmapData, function (d) {
            return d.x + ':' + d.y;
        })
        .enter()
        .append("rect")
        .attr("x", function (d) {
            return heatmapX(d.x)
        })
        .attr("y", function (d) {
            return heatmapY(d.y)
        })
        .attr("width", heatmapX.bandwidth())
        .attr("height", heatmapY.bandwidth())
        .style("stroke-width", "2")
        .style("stroke", "black")
        .style("stroke-opacity", 0.6)
        .style("fill", function (d) {
            return heatmapColor(d.value)
        })
        .on("mouseover", function (d) {
            mouseOverNode(this, d, species, currentValue);
        })
        .on("mouseleave", function () {
            d3.select(this)
                .style("stroke-width", "2")
                .style("stroke-opacity", 0.6);

            d3.select("#menu-heatmap-data")
                .selectAll("p").remove();
        })
        .on("click", function (d) {
            drawGraphFromNode(d);
            onSpeciesButtonClick(getIndexIdentifier(getCompartmentFromSpecies(species), species));
            setChartTitle("Node (" + d.x + "," + d.y + ")");
        })
}

function mouseOverNode(currentNode, CurrentNodeObject, species, dragedTime) {

    d3.select(currentNode)
        .style("stroke-width", "5");

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
            if (!compartmentsOfSelectedNode.includes(compartment)) {
                compartmentsOfSelectedNode.push(compartment)
            }
        })
    });
}

function drawGraphFromNode(data) {
    compartmentsOfSelectedNode.length = 0;
    activeComponentIdices.length = 0;
    selectedNode = "n(" + data.x + "," + data.y + ")";
    setNodeCompartments();
    clearHtmlTags();
    sumCurrentNodeData();
    initializeMainContent();

}