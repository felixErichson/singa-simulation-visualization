function loadFile() {

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
        $('#nav-option').css('visibility', 'hidden');
        $('#nav-figure').css('visibility', 'hidden');

        d3.select("#loadFileHint").remove();

        d3.select("body")
            .append("div")
            .attr("id", "spinner")
            .attr("class", "spinner-grow text-success");

        resetGlobalArrays();
        btnAllTrajectoriesVisible();
        clearHtmlTags();
        d3.select('#trajectory-view-heatmap').html('');
        d3.select('#trajectory-view-heatmap').append("div").attr("class", "loader");
        d3.select("#play-button").remove();
        d3.select("#forward").remove();
        d3.select("#backward").remove();
        d3.selectAll('#heatmap-view-slider svg').remove();
        reader.readAsText(file);
    }
}


let currentTime,
    currentCompartment,
    currentNode,
    parent;

function readDataFromCsv() {
    globalData = d3.csvParse(reader.result);

    prepareDataFromCsv();
    prepareNestedDataFromCsv(globalData);
    sumData();
    setHeatmapDropdown("#heatmap-view-species-selection", "select species", "csv");

}

function readDataFromJson() {

    globalData = JSON.parse(reader.result);
    nestedData = d3.map();

    prepareNestedDataFromJson(globalData);
    sumData();
    setHeatmapDropdown("#heatmap-view-species-selection", "select species");
    setVesiclePaths();
}

function prepareDataFromCsv() {
    globalData.forEach(function (d) {
        d.elapsed_time = +d["elapsed timeSteps"];
        d.concentration = +d.concentration;

        if (!timeSteps.includes(d.elapsed_time)) {
            timeSteps.push(d.elapsed_time)
        }
        /** @namespace d.compartment */
        if (!compartmentIdentifiers.includes(d.compartment)) {
            compartmentIdentifiers.push(d.compartment)
        }
        if (!speciesIdentifiers.includes(d.species)) {
            speciesIdentifiers.push(d.species)
        }
    });
}

let currentSpecies;

/**
 * Traverses through the JSON file and creates new data format.
 * data format:
 * timestep
 * ---node
 * -----compartment
 * --------species:concentration
 * --------positions
 *
 * @param JSON Data
 */
function prepareNestedDataFromJson(data) {

    for (let currentKey in data) {

        if (data[currentKey] !== null) {

            if (typeof (data[currentKey]) === "object") {

                if (parent === "trajectory-data") {
                    currentTime = currentKey;
                    if (!timeSteps.includes(currentKey)) {
                        timeSteps.push(parseFloat(currentKey));
                        nestedData.set(currentKey, d3.map());
                        vesicleStates.set(currentKey, d3.map());
                    }
                }

                if (parent === "data") {
                    currentNode = currentKey;

                    if (!nodeIdentifiers.includes(currentKey)) {
                        nodeIdentifiers.push(currentKey)

                    }
                    nestedData.get(currentTime).set(currentNode, d3.map())

                }

                if (parent === "subsections") {
                    currentCompartment = currentKey;
                    if (!compartmentIdentifiers.includes(currentKey)) {
                        compartmentIdentifiers.push(currentKey);

                    }
                    if (nestedData.get(currentTime).get(currentNode) !== undefined) {
                        nestedData.get(currentTime).get(currentNode).set(currentCompartment, d3.map())
                    }
                }

                if (currentKey === "positions") {
                    if (nestedData.get(currentTime).get(currentNode) !== undefined) {
                        nestedData.get(currentTime).get(currentNode).get(currentCompartment).set(currentKey, data[currentKey]);
                    }
                }
                const grandparent = parent;
                parent = currentKey;
                prepareNestedDataFromJson(data[currentKey]);
                parent = grandparent;

            } else {

                if (parent === "concentrations") {
                    currentSpecies = currentKey;
                    if (!speciesIdentifiers.includes(currentKey)) {
                        speciesIdentifiers.push(currentKey);
                    }
                    if (nestedData.get(currentTime).get(currentNode) !== undefined) {
                        nestedData.get(currentTime).get(currentNode).get(currentCompartment).set(currentKey, data[currentKey]);

                    }

                }

                if (currentKey === "state") {
                    vesicleStates.get(currentTime).set(currentNode, data[currentKey]);
                }

                if (currentKey === "timeSteps-unit") {
                    timeUnit = data[currentKey];
                } else if (currentKey === "concentration-unit") {
                    concentrationUnit = data[currentKey]
                } else if (currentKey === "simulation-width") {
                    simulationWidth = data[currentKey]
                } else if (currentKey === "simulation-height") {
                    simulationHeight = data[currentKey]
                }

            }
        }
    }

}

/**
 * Nest the data from CSV files.
 *timestep
 *  ---n(0,0)
 *  -----compartment
 *  --------species:concentration
 * @param CSV Data
 */
function prepareNestedDataFromCsv(data) {

    nestedData =
        d3.nest()
            .key(function (d) {
                return d.elapsed_time;
            })
            .key(function () {
                return "n(0,0)"
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


/**
 * Creates an arry of all compartment species combinations
 * [compartment_species]
 */
function sumData() {
    let rememberSpecies = [];
    compartmentIdentifiers.forEach(function (compartment) {
        nestedData.keys().forEach(function (timeStep) {
            nestedData.get(timeStep).keys().forEach(function (node) {
                if (nestedData.get(timeStep).get(node).get(compartment) !== undefined
                    && nestedData.get(timeStep).get(node).get(compartment).keys() !== undefined) {
                    nestedData.get(timeStep).get(node).get(compartment).keys().forEach(function (species) {
                        if (!componentCombinations.includes(compartment+"_"+species)
                            && nestedData.get(timeStep).get(node).get(compartment).get(species) !== 0
                            && nestedData.get(timeStep).get(node).get(compartment).get(species) !== undefined) {
                            rememberSpecies.push(species);
                            selectedNode = node;
                            componentCombinations.push(compartment + "_" + species);
                        }
                    })
                }
            })
        })
    });

}

/**
 * Creates an Array of all compartment species combinations with assigned concentrations of one node
 * [compartment_species] = concentration;
 *
 */
function sumCurrentNodeData() {
    reducedNodeData = [];
    let combinationsofComponants = [];

    nestedData.keys().forEach(function (timeStep) {
        if (nestedData.get(timeStep).get(selectedNode) !== undefined) {
            nestedData.get(timeStep).get(selectedNode).keys().forEach(function (compartment) {
                nestedData.get(timeStep).get(selectedNode).get(compartment).keys().forEach(function (species) {
                    if (!combinationsofComponants.includes(compartment + "_" + species)
                        && nestedData.get(timeStep).get(selectedNode).get(compartment).get(species) !== undefined
                        && nestedData.get(timeStep).get(selectedNode).get(compartment).get(species) > 0) {


                        combinationsofComponants.push(compartment + "_" + species);
                        reducedNodeData[compartment + "_" + species] = filterData(compartment, species);


                    }
                })
            })
        }
    });
}

function setVesiclePaths() {

    let vesicles = [];
    xSc = d3.scaleLinear().domain([0, simulationWidth]).range([0, 450]);
    ySc = d3.scaleLinear().domain([0, simulationHeight]).range([0, 450]);

    nestedData.entries().forEach(function (updatable) {
        updatable.value.entries().forEach(function (compartment) {
        if(compartment.key.startsWith("v")){
            if (vesicles.includes(compartment.key)){
             vesiclePaths.set(compartment.key ,vesiclePaths.get(compartment.key) +  " L " + xSc(compartment.value.get("vesicle lumen").get("positions")[0].x) + "," + ySc (compartment.value.get("vesicle lumen").get("positions")[0].y))
            } else {
                vesicles.push(compartment.key);
                vesiclePaths.set(compartment.key, "M " + xSc(compartment.value.get("vesicle lumen").get("positions")[0].x) + "," + ySc( compartment.value.get("vesicle lumen").get("positions")[0].y))
            }
        }
    })
    });
    console.log(vesiclePaths);
}