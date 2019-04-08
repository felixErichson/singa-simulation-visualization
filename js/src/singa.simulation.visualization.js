//Global variables

//import * as allTrajectories from './all-trajectories.js';

const margin = {top: 40, right: 25, bottom: 40, left: 25},
    width = parseInt(d3.select(".trajectory").style("width")) - margin.left - margin.right,
    height = parseInt(d3.select(".trajectory").style("height")) - margin.top - margin.bottom;

const marginSlider = {top: 50, right: 50, bottom: 0, left: 50},
    widthSlider = 600 - marginSlider.left - marginSlider.right,
    heightSlider = 200 - marginSlider.top - marginSlider.bottom;

const heatMargin = {top: 30, right: 30, bottom: 30, left: 30},
    heatwidth = 450 - heatMargin.left - heatMargin.right,
    heatheight = 450 - heatMargin.top - heatMargin.bottom;

const color = ['#d95f02', '#7570b3', '#e7298a'];

let x = d3.scaleLinear().range([0, width]),
    y0 = d3.scaleLinear().range([height, 0]),
    y1 = d3.scaleLinear().range([height, 0]),
    y2 = d3.scaleLinear().range([height, 0]);

let summedData = [],
    componentCombinations = [],
    summedNodeData = [],
    activeTrajectories = [],
    time = [],
    selectedNode,
    compartmentsOfSelectedNode = [],
    allCompartments = [],
    allSpecies = [],
    allNodes = [],
    timeUnit = null,
    concentrationUnit = null,
    reader = new FileReader(),
    globalData = null,
    valueline1 = d3.line(),
    svgMain,
    heatmapSvg,
    heatmapY,
    heatmapX,
    currentTime,
    currentCompartment,
    currentNode,
    parent,
    globalSearchIterator,
    buttonNumber,
    searchButtonDataArray = [],
    heatmapData = [],
    heatmapXRange = [],
    heatmapYRange = [],
    playButton,
    heatmapColor,
    selectedTime,
    sliderPosition;

let regEx = new RegExp("\\((\\d+), (\\d+)\\)", "g");

//Functions to read and structure the data into a uniform data format (nestedData)


function getCompartmentFromStringIdentifier(identifier) {
    return identifier.substr(0, identifier.indexOf("_"));
}

function getSpeciesFromStringIdentifier(identifier) {
    return identifier.substr(identifier.indexOf("_") + 1);
}

$(document).ready(function () {
    $('input:checkbox').click(function () {
        $('input:checkbox').not(this).prop('checked', false);
    });
});

function resetGlobalArrays() {
    componentCombinations.length = 0;
    summedNodeData.length = 0;
    activeTrajectories.length = 0;
    time.length = 0;
    compartmentsOfSelectedNode.length = 0;
    allSpecies.length = 0;
    allCompartments.length = 0;
    allNodes.length = 0;
    heatmapData.length = 0;
    heatmapXRange.length = 0;
    heatmapYRange.length = 0;
}

function btnAllTrajectoriesVisible() {
    $(".input-group.mb-3").removeClass("invisible");
    $(".input-group.mb-3").toggleClass("visible");
    $(".nav.nav-tabs.justify-content-center").removeClass("invisible");
    $(".nav.nav-tabs.justify-content-center").toggleClass("visible");

}

function clearHtmlTags() {
    d3.select("#menu-all-trajectories").html("");
    d3.select("#menu-all-trajectories").selectAll("*").remove();
    d3.select(".trajectory").html("");
    d3.select(".box").html("");
    d3.select('#menu-custom-search-component-list').html("");
    d3.select("#menu-custom-search-creation-area").html("");
    d3.select("#search_button_area").html("");
    $("#search_buttons").hide();

}

function loadExample(fileEnding) {
    resetGlobalArrays();
    btnAllTrajectoriesVisible();
    clearHtmlTags();
    d3.select('.heat').html('');

    if (fileEnding === "csv") {
        d3.csv("js/src/example_trajectories.csv", function (data) {
            globalData = data;
        });
        setTimeout(function () {
            prepareDataFromCsv();
            prepareNestedDataFromCsv(globalData);
            sumData();
            setHeatmapDropdown();
        }, 200)

    } else if (fileEnding === "json") {
        d3.json("js/src/example_trajectories.json", function (data) {
            globalData = data;
        });
        setTimeout(function () {
            nestedData = d3.map();
            prepareHeatmapData(globalData);
            sumData();
            setHeatmapDropdown();
        }, 200);
    }

}

function loadFile() {

    resetGlobalArrays();
    btnAllTrajectoriesVisible();
    clearHtmlTags();
    d3.select('.heat').html('');

    let file = document.querySelector('input[type=file]').files[0];
    reader = new FileReader();
    if (file.name.endsWith(".json")) {
        reader.addEventListener("load", readDataFromJson, false);
    } else if (file.name.endsWith(".csv")) {
        reader.addEventListener("load", readDataFromCsv, false);
    } else {
        alert("only json and csv allowed");
    }
    if (file) {
        reader.readAsText(file);
    }
    $('#fileBrowserModal').modal('toggle');

}

function readDataFromCsv() {
    globalData = d3.csvParse(reader.result);

    prepareDataFromCsv();
    prepareNestedDataFromCsv(globalData);
    sumData();
    setHeatmapDropdown();

}

function prepareDataFromCsv() {
    globalData.forEach(function (d) {
        d.elapsed_time = +d["elapsed time"];
        d.concentration = +d.concentration;

        if (!time.includes(d.elapsed_time)) {
            time.push(d.elapsed_time)
        }
        if (!allCompartments.includes(d.compartment)) {
            allCompartments.push(d.compartment)
        }
        if (!allSpecies.includes(d.species)) {
            allSpecies.push(d.species)
        }
    });
}

function prepareNestedDataFromCsv(data) {

    nestedData =
        d3.nest()
            .key(function (d) {
                return d.elapsed_time;
            })
            .key(function (d) {
                return "Node (0, 0)"
            })
            .key(function (d) {
                return d.compartment;
            })
            .key(function (d) {
                return d.species;
            })
            .rollup(function (v) {
                return d3.sum(v, function (d) {
                    return d.concentration;
                });
            })
            .map(data);
}

function readDataFromJson() {

    globalData = JSON.parse(reader.result);
    nestedData = d3.map();

    prepareHeatmapData(globalData);
    sumData();
    setHeatmapDropdown();
}

function prepareHeatmapData(data) {

    for (let currentKey in data) {

        if (data[currentKey] !== null) {
            if (typeof (data[currentKey]) === "object") {

                if (parent === "trajectory-data") {
                    currentTime = currentKey;
                    if (!time.includes(currentKey)) {
                        time.push(parseFloat(currentKey));
                        nestedData.set(currentKey, d3.map())
                    }
                }

                if (parent === "concentration-data") {
                    currentNode = currentKey;
                    if (!allNodes.includes(currentKey)) {
                        allNodes.push(currentKey)

                    }
                    nestedData.get(currentTime).set(currentNode, d3.map())
                }

                if (parent === "concentrations") {
                    currentCompartment = currentKey;
                    if (!allCompartments.includes(currentKey)) {
                        allCompartments.push(currentKey);

                    }
                    nestedData.get(currentTime).get(currentNode).set(currentCompartment, d3.map())
                }
                const grandparent = parent;
                parent = currentKey;
                prepareHeatmapData(data[currentKey]);
                parent = grandparent;

            } else {

                if (currentKey === "time-unit") {

                    timeUnit = data[currentKey];

                } else if (currentKey === "concentration-unit") {

                    concentrationUnit = data[currentKey]
                } else {
                    if (!allSpecies.includes(currentKey)) {
                        allSpecies.push(currentKey);
                    }
                    nestedData.get(currentTime).get(currentNode).get(currentCompartment).set(currentKey, data[currentKey]);
                }
            }
        }
    }
}

function getCompartmentFromSpecies(species) {
    let compartment = "";
    componentCombinations.forEach(function (currentTrajectory) {
        if (currentTrajectory.split("_")[1] === species) {
            compartment = currentTrajectory.split("_")[0];
        }
    });
    return compartment;
}

function appendPlayButton() {

    d3.select("#slider_div")
        .append("button")
        .attr("id", "play-button")
        .attr("class", "btn btn-primary")
        .text("Play");

    playButton = d3.select("#play-button")
}

function setHeatmapDropdown() {

    let dropdown = d3.select(".heat")
        .append("div")
        .attr("class", "btn-group")
        .attr("id", "heatmap_dropdown")
        .style("margin-top", "5px")
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


//TODO hinzufügen aus den summierten daten um suche einzubinden
    for (let i in allSpecies) {
        d3.select("#heat_menu")
            .append("a")
            .attr("class", "dropdown-item")
            .attr("id", i)
            .text(allSpecies[i])
            .on("click", function () {

                $("#dropdown_button").text("species: " + $(this).text());
                d3.selectAll('.heat svg').remove();
                d3.select("#slider_div").html("");
                d3.selectAll('#slider_div svg').remove();

                setHeatmapRange();
                setHeatMapSvg();
                appendPlayButton();
                drawSilder($(this).text());
                clearHtmlTags();
            })
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
    for (var i = 0; i < numStops; i++) {
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

function setHeatMapSvg() {

    heatmapSvg = d3.select(".heat")
        .append("svg")
        .attr("width", heatwidth + heatMargin.left + heatMargin.right)
        .attr("height", heatheight + heatMargin.top + heatMargin.bottom)
        .append("g")
        .attr("transform",
            "translate(30,10)");

    heatmapX = d3.scaleBand()
        .range([0, heatwidth])
        .domain(heatmapXRange)
        .padding(0.01);

    heatmapY = d3.scaleBand()
        .range([heatheight, 0])
        .domain(heatmapYRange)
}

function getHeatmapData(currentTimeStep, compartment, species) {

    heatmapData.length = 0;
    let obj;

    console.log(compartment);


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

function setHeatmapColor(compartment, species) {

    if ($('input[name="check"]:checked').val() === "relative") {

        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain([0, d3.max(heatmapData, function (d) {
                return d.value

            })
            ])
    } else {

        let maxValue = 0.0;

        nestedData.values().forEach(function (node) {
            node.values().forEach(function (currentSpecies) {
                currentSpecies.values().forEach(function (currentValues) {
                    currentValues.entries().forEach(function (currentEntry) {
                        if (currentEntry.key === species) {
                            if (maxValue < currentEntry.value)
                                maxValue = currentEntry.value;
                        }
                    })
                })
            })
        });

        return d3.scaleLinear()
            .range(["#f1ff7f", "#0cac79"])
            .domain([0, maxValue])
    }
}

function mouseOverNode(currentNode, data, species, currentValue) {

    d3.select(currentNode)
        .style("stroke-width", "5");

    d3.select("#data")
        .append("p")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("Node (" + data.x + "," + data.y + ")");

    d3.select("#data")
        .append("p")
        .attr("id", "showed_species")
        .attr("position", "absolute")
        .attr("bottom", "0");

    if (data.value === 0) {
        d3.select("#showed_species").text("species: nothing to find here")
    } else {
        d3.select("#showed_species").text("species: " + species)
    }

    d3.select("#data")
        .append("p")
        .attr("id", "showed_species")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("possible nodeCompartments: " + nestedData.get(currentValue).get("Node (" + data.x + ", " + data.y + ")").keys());


    d3.select("#data")
        .append("p")
        .attr("position", "absolute")
        .attr("bottom", "0")
        .text("value: " + data.value)
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

            d3.select("#data")
                .selectAll("p").remove();
        })
        .on("click", function (d) {
            drawGraphFromNode(d);
            clickButton(getIndexIdentifier(getCompartmentFromSpecies(species), species));
            setChartTitle("Node (" + d.x + "," + d.y + ")");
        })
}

function changeVerticalLineData(selectedTime) {

    d3.select(".verticalLine")
        .attr("x1", x(time[selectedTime]))
        .attr("x2", x(time[selectedTime]));

    let id1 = activeTrajectories[0];
    let data = summedNodeData[getCompartmentFromId(id1) + "_" + getSpeciesFromId(id1)];
    data = data[selectedTime];

    d3.select(".verticalLine.Label")
        .datum(data)
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y0(d.y) + ")";
        }).text(function (d) {
        return d.y;
    });

    d3.select(".verticalLine.Circle")
        .datum(data)
        .attr("transform", function (d) {
            return "translate(" + x(d.x) + "," + y0(d.y) + ")";
        });


    if (activeTrajectories[1] !== undefined) {

        let id2 = activeTrajectories[1];
        let data2;

        data2 = summedNodeData[getCompartmentFromId(id2) + "_" + getSpeciesFromId(id2)];
        data2 = data2[selectedTime];

        d3.select(".verticalLine.Label2")
            .datum(data2)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + y1(d.y) + ")";
            }).text(function (d) {
            return d.y;

        });

        d3.select(".verticalLine.Circle2")
            .datum(data2)
            .attr("transform", function (d) {
                return "translate(" + x(d.x) + "," + y1(d.y) + ")";
            })
    }
}

function drawSilder(species) {


    let svgSlider = d3.select("#slider_div")
        .append("svg")
        .attr("style", "margin-left: 20%")
        .attr("width", widthSlider + marginSlider.left + marginSlider.right)
        .attr("height", heightSlider + marginSlider.top + marginSlider.bottom);

    let compartment = getCompartmentFromSpecies(species);
    console.log(compartment);

    selectedTime = time[0];

    getHeatmapData(selectedTime, compartment, species);
    heatmapColor = setHeatmapColor(compartment, species);
    drawHeatmapRectangles(selectedTime, species);

    let moving = false;
    selectedTime = 0;
    let targetValue = widthSlider;

    let xtime = d3.scaleLinear()
        .domain([0, time.length - 1])
        .range([0, widthSlider])
        .clamp(true);

    let slider =
        svgSlider
            .append("g")
            .attr("class", "slider")
            .attr("transform", "translate(" + marginSlider.left + "," + heightSlider / 3 + ")");


    slider.append("line")
        .attr("class", "track")
        .attr("x1", xtime.range()[0])
        .attr("x2", xtime.range()[1])
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
                selectedTime = Math.trunc(xtime.invert(d3.event.x));
                update(selectedTime);

            })
        );

    slider.insert("g", ".track-overlay")
        .attr("class", "ticks")
        .attr("transform", "translate(0," + 10 + ")")
        .selectAll("text")
        .data(xtime.ticks(10))
        .enter()
        .append("text")
        .attr("x", xtime)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .text(function (d) {
            return d3.format(".0f")(time[d])
        });

    let handle = slider.insert("circle", ".track-overlay")
        .attr("class", "handle")
        .attr("r", 9);

    let label = slider.append("text")
        .attr("class", "label333")
        .attr("text-anchor", "middle")
        .text(time[0])
        .attr("transform", "translate(0," + (-25) + ")");

    playButton
        .on("click", function () {
            var button = d3.select(this);
            if (button.text() === "Pause") {
                moving = false;
                clearInterval(timer);
                // timer = 0;
                button.text("Play");
            } else {
                moving = true;
                timer = setInterval(step, 100);
                button.text("Pause");
            }
        });

    function step() {
        update(selectedTime);
        selectedTime = selectedTime + (5);
        if (selectedTime > time.length - 1) {
            moving = false;
            selectedTime = 0;
            clearInterval(timer);
            playButton.text("Play");
        }
    }

    function update(h) {
        // update position and text of label according to slider scale
        handle.attr("cx", xtime(h));

        label.attr("x", xtime(h))
            .text(d3.format(".3f")(time[h]));

        getHeatmapData(time[h], compartment, species);
        heatmapColor = setHeatmapColor(compartment, species);
        drawHeatmapRectangles(time[h], species);
        drawHeatmapLegend();
        if (activeTrajectories[0] !== undefined) {
            changeVerticalLineData(h);
        }
    }
}

function appendDataViewLabel(className, dyPosition) {
    svgMain.append("text")
        .attr("class", "verticalLine " + className)
        .attr("x", 10)
        .attr("style", "font-size: 15px")
        .attr("dy", dyPosition)
}

function appendDataViewCircle(className, strokeColor) {
    svgMain.append("circle")
        .attr("class", "verticalLine " + className)
        .attr("r", 7)
        .style("stroke", strokeColor)
        .attr("x", 0)
        .attr("dy", 0)
        .style("fill", "none")
        .style("stroke-width", "1px")
        .style("opacity", "1");
}

function initializeLineDataView() {

    if (activeTrajectories[0] !== undefined) {

        svgMain.append("line")
            .attr("class", "verticalLine")
            .attr("x1", 0)
            .attr("y1", 0)
            .attr("x2", 0)
            .attr("y2", height)
            .style("stroke-width", 1)
            .style("stroke", "#808080")
            .style("fill", "none");

        appendDataViewLabel("Label", 5);
        appendDataViewCircle("Circle", color[0]);

        if (activeTrajectories[1] !== undefined) {
            appendDataViewLabel("Label2", 15);
            appendDataViewCircle("Circle2", color[1]);
        }
    }
}

function setNodeCompartments() {
    nestedData.keys().forEach(function (timestep) {
        nestedData.get(timestep).get(selectedNode).keys().forEach(function (compartment) {
            if (!compartmentsOfSelectedNode.includes(compartment)) {
                compartmentsOfSelectedNode.push(compartment)
            }
        })
    });
}

function drawGraphFromNode(data) {
    compartmentsOfSelectedNode.length = 0;
    activeTrajectories.length = 0;
    selectedNode = "Node (" + data.x + ", " + data.y + ")";
    setNodeCompartments();
    clearHtmlTags();
    sumCurrentNodeData();
    initializeMainContent();
    initializeLineDataView();
}

function initializeMainContent() {
    prepareSelectionButtons();
    initialMainSvg();
    createAllTrajectoriesMenu();
    addListOfSpecies();
    globalSearchIterator = 0;
    buttonNumber = 0;
    searchButtonDataArray.length = 0;
    addHeadOfSearchField();
    addCompartmentSelection();
}

function sumData() {

    let rememberSpecies = [];
    allCompartments.forEach(function (compartment) {
        nestedData.keys().forEach(function (timeStep) {
            nestedData.get(timeStep).keys().forEach(function (node) {
                if (nestedData.get(timeStep).get(node).get(compartment) !== undefined && nestedData.get(timeStep).get(node).get(compartment).keys() !== undefined) {
                    nestedData.get(timeStep).get(node).get(compartment).keys().forEach(function (species) {
                        if (!rememberSpecies.includes(species) && nestedData.get(timeStep).get(node).get(compartment).get(species) !== 0 && nestedData.get(timeStep).get(node).get(compartment).get(species) !== undefined) {
                            rememberSpecies.push(species);
                            selectedNode = node;
                            componentCombinations.push(compartment + "_" + species);
                        }
                    })
                }
            })
        })
    });
  //  console.log(componentCombinations);
}

function sumCurrentNodeData() {

    let rememberSpecies = [];
    compartmentsOfSelectedNode.forEach(function (compartment) {
        nestedData.keys().forEach(function (timeStep) {
            nestedData.get(timeStep).get(selectedNode).get(compartment).keys().forEach(function (species) {
                if (!rememberSpecies.includes(species) && nestedData.get(timeStep).get(selectedNode).get(compartment).get(species) !== undefined && nestedData.get(timeStep).get(selectedNode).get(compartment).get(species) > 0) {
                    rememberSpecies.push(species);
                    summedNodeData[compartment + "_" + species] = filterData(compartment, species);

                }
            })
        })
    })
   // console.log(summedNodeData);
}

function filterData(compartment, spec) {

    let trajectoryData = [];
    let obj = {};

    nestedData.keys().forEach(function (element) {
        if (nestedData.get(element).get(selectedNode).get(compartment).get(spec) === undefined) {
            obj = {
                x: parseFloat(element),
                y: 0
            };
            trajectoryData.push(obj);
        } else {
            obj = {
                x: parseFloat(element),
                y: nestedData.get(element).get(selectedNode).get(compartment).get(spec)
            };
            trajectoryData.push(obj);
        }
    });
    return trajectoryData;
}

// Functions to display all trajectories in a modal


// Functions to create buttons and their click events and how to create the ID and get data from the ID

function prepareSelectionButtons() {

    let rememberSpecies = [];
    compartmentsOfSelectedNode.forEach(function (comp) {
        d3.select(".box")
            .append("div")
            .attr("id", "compartment_" + compartmentsOfSelectedNode.indexOf(comp))
            .attr("class", "list " + comp)
            .append("h4")
            .text(comp);

        nestedData.keys().forEach(function (element) {
            nestedData.get(element).get(selectedNode).get(comp).keys().forEach(function (buttonSpecies) {
                if (!rememberSpecies.includes(buttonSpecies) && nestedData.get(element).get(selectedNode).get(comp).get(buttonSpecies) > 0) {
                    rememberSpecies.push(buttonSpecies);
                    appendSelectionButton(comp, buttonSpecies);
                }
            })
        })
    });
    checkEmptyCompartment();
}

function appendSelectionButton(comp, buttonSpecies) {
    d3.select("#compartment_" + compartmentsOfSelectedNode.indexOf((comp)))
        .append("div")
        .attr("class", "col-md-4 center-block")
        .append("button")
        .attr("id", getIndexIdentifier(comp, buttonSpecies))
        .attr("class", "btn btn-outline-secondary")
        .attr("type", "button")
        .text(buttonSpecies)
        .on("click", function () {
            clickButton(this.id)
        });
}

function clickButton(id) {
    if (activeTrajectories.length < 2 && $("#" + id).attr("class") === "btn btn-outline-secondary") {
        addLineOnClick(id);
    } else if ($("#" + id).attr("class") === "btn btn-outline-secondary active") {
        removeLineOnClick(id)
    }
}

function addLineOnClick(id) {
    activeTrajectories.push(id);
    $("#" + id).toggleClass("active");
    prepareGraph();
}

function removeLineOnClick(id) {
    $("#" + id + ".btn-outline-secondary.active").removeAttr("style");
    $("#" + id).removeClass('active');
    let index = activeTrajectories.indexOf(id);
    if (index > -1) {
        activeTrajectories.splice(index, 1);
    }
    prepareGraph();
}

function getSpeciesFromId(id) {
    if (id.split("_")[0] === "search") {
        return id.split("_")[1]
    } else {
        return allSpecies[parseInt(id.split("_")[1])]
    }
}

function getCompartmentFromId(id) {
    if (id.split("_")[0] === "search") {
        return "search"
    } else {
        return compartmentsOfSelectedNode[parseInt(id.split("_")[0])]
    }
}


/**
 *
 *
 * @param selectedComp
 * @param selectedSpecies
 * @return {string}
 */
function getIndexIdentifier(selectedComp, selectedSpecies) {
    return compartmentsOfSelectedNode.indexOf(selectedComp) + "_" + allSpecies.indexOf(selectedSpecies)
}

function checkEmptyCompartment() {

    compartmentsOfSelectedNode.forEach(function (comp) {
        if ($(".col-md-4").parents('#compartment_' + compartmentsOfSelectedNode.indexOf(comp)).length === 1) {
        } else {

            d3.select('#compartment_' + compartmentsOfSelectedNode.indexOf(comp))
                .append("h5")
                .text("[Empty]")
        }
    })
}

//Functions that organize the main window. Create coordinate system and draw the trajectories.

function initialMainSvg() {
    svgMain = d3.select(".trajectory")
        .attr("id", "chart")
        .append("svg")
        .attr("width", width)//+ margin.left + margin.right
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", "-50 +80 " + (100 + parseInt(d3.select(".trajectory").style("width"))) + " " + parseInt(d3.select(".trajectory").style("height")))
        .attr("preserveAspectRatio", "xMidYMax meet")
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
}

function setChartTitle(node) {
    svgMain.append("text")
        .attr("x", (width / 2))
        .attr("y", 0 - (margin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("text-decoration", "underline")
        .text(node);
}

function removeElementsOfSvg() {
    d3.selectAll("#line").remove();
    d3.selectAll(".x.axis").remove();
    d3.selectAll(".y.axis.left").remove();
    d3.selectAll(".y.axis.right").remove();
    d3.selectAll(".label").remove();
    d3.selectAll(".verticalLine").remove();
}

function setPath(data, scale, axis, line, iterator, buttonId) {

    scale.domain([0, d3.max(data, function (d) {
        return d.y;
    })]);
    setYAxis(axis, color[iterator]);
    addLine(data, color[iterator], line);
    $(buttonId + ".btn-outline-secondary:not(:disabled):not(.disabled).active").css("background-color", color[iterator], "!important");
}

function prepareGraph() {
    let iterator = 0;
    removeElementsOfSvg();
    initializeLineDataView();
    labelAxis();
    x.domain(d3.extent(time));
    setXAxis();
    activeTrajectories.forEach(function (content) {
        let data;
        let id;
        let scale = null;

        if (getCompartmentFromStringIdentifier(content) === "search") {
            data = searchButtonDataArray[content.substr(content.indexOf("_") + 1)];
            id = "#search_" + content.substr(content.indexOf("_") + 1);
        } else {
            let comp = getCompartmentFromId(activeTrajectories[iterator]);
            let spec = getSpeciesFromId(activeTrajectories[iterator]);
            data = filterData(comp, spec);
            id = "#" + getIndexIdentifier(comp, spec);
        }
        if (iterator === 0) {
            scale = y0;
            setPath(data, scale, "y axis left outer", "valueline1", iterator, id);
        } else if (iterator === 1) {
            scale = y1;
            setPath(data, scale, "y axis right", "", iterator, id);
        }
        iterator++
    })
}

function labelAxis() {
    //label X-Axis
    svgMain.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", width)
        .attr("y", height + 50)
        .attr("font-size", 20)
        .text("Elapsed time [ms]");

//label Y-Axis
    svgMain.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", -10)
        .attr("x", 130)
        .attr("font-size", 20)
        .text("Concentration [nmol/l]");
}

function setXAxis() {

    svgMain.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .attr("font-size", 15);
}

function setYAxis(name, color) {

    svgMain.append("g")
        .attr("class", name);

    if (name === "y axis right") {

        d3.select(".y.axis.right").attr("transform", "translate(" + width + " ,0)")
            .call(d3.axisRight(y1).tickFormat(d3.format('.3f')))
            .styles({
                fill: "none", stroke: color
            })
            .attr("font-size", 17);

    } else if (name === "y axis left outer") {

        d3.select(".y.axis.left.outer")
            .call(d3.axisLeft(y0).tickFormat(d3.format('.3f')))
            .styles({
                fill: "none", stroke: color
            })
            .attr("font-size", 17);
    } else if (name === "y axis left inner") {

        d3.select(".y.axis.left.inner")
            .call(d3.axisRight(y2).tickFormat(d3.format('.3f')))
            .styles({
                fill: "none", stroke: color
            })
            .attr("font-size", 17)
    }
}

function addLine(data, color, name) {

    svgMain.append("path")
        .datum(data)
        .attr("id", "line")
        .style("stroke", color)
        .attr("d", valueline1
            .x(function (d) {
                return x(d.x);
            })
            .y(function (d) {
                if (name === "valueline1") {
                    return y0(d.y);
                } else if (name === "valueline3") {
                    return y2(d.y)
                } else {
                    return y1(d.y)
                }
            }));
}

// Other
function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}