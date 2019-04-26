function loadExample(fileEnding) {
    resetGlobalArrays();
    btnAllTrajectoriesVisible();
    clearHtmlTags();
    d3.select('#trajectory-view-heatmap').html('');

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
        d3.json("js/src/example_simulation.json", function (data) {
            globalData = data;
        });
        setTimeout(function () {
            nestedData = d3.map();
            prepareNestedDataFromJson(globalData);
            sumData();
            setHeatmapDropdown();
        }, 200);
    }

}


function loadFile() {
    d3.select("#loadFileHint").remove();

    d3.select("#trajectory-view-heatmap")
        .append("div")
        .attr("id", "spinner")
        .attr("class", "spinner-grow text-success" );

    resetGlobalArrays();
    btnAllTrajectoriesVisible();
    clearHtmlTags();
    d3.select('#trajectory-view-heatmap').html('');

    d3.select('#trajectory-view-heatmap').append("div").attr("class", "loader");


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
    setHeatmapDropdown();

}

function readDataFromJson() {

    globalData = JSON.parse(reader.result);
    nestedData = d3.map();

    prepareNestedDataFromJson(globalData);
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
        /** @namespace d.compartment */
        if (!allCompartments.includes(d.compartment)) {
            allCompartments.push(d.compartment)
        }
        if (!allSpecies.includes(d.species)) {
            allSpecies.push(d.species)
        }
    });
}

function prepareNestedDataFromJson(data) {

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

                if (parent === "data") {
                    currentNode = currentKey;
                    //if (!currentNode.startsWith("v")) { //TODO vesicle is ignored here
                    if (!allNodes.includes(currentKey)) {
                        allNodes.push(currentKey)

                    }
                    nestedData.get(currentTime).set(currentNode, d3.map())
                    //}
                }

                if (parent === "concentrations") {
                    currentCompartment = currentKey;
                    if (!allCompartments.includes(currentKey)) {
                        allCompartments.push(currentKey);

                    }
                    if (nestedData.get(currentTime).get(currentNode) !== undefined) { //TODO vesicle is ignored here
                        nestedData.get(currentTime).get(currentNode).set(currentCompartment, d3.map())
                    }
                }

                const grandparent = parent;
                parent = currentKey;
                prepareNestedDataFromJson(data[currentKey]);
                parent = grandparent;

            } else {

                if (currentKey === "time-unit") {

                    timeUnit = data[currentKey];

                } else if (currentKey === "concentration-unit") {

                    concentrationUnit = data[currentKey]
                } else if (parent !== "position") {
                    if (!allSpecies.includes(currentKey)) {
                        allSpecies.push(currentKey);
                    }
                    if (nestedData.get(currentTime).get(currentNode) !== undefined) { //TODO vesicle is ignored here
                        nestedData.get(currentTime).get(currentNode).get(currentCompartment).set(currentKey, data[currentKey]);
                    }
                } else {
                    if (nestedData.get(currentTime).get(currentNode) !== undefined) { //TODO vesicle is ignored here
                        nestedData.get(currentTime).get(currentNode).set(currentKey, data[currentKey]);
                    }
                }
            }
        }
    }

}

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
      console.log(componentCombinations);
}


function sumCurrentNodeData() {
    nodeComponentCombinations.length = 0;
    let rememberSpecies = [];
    compartmentsOfSelectedNode.forEach(function (compartment) {
        //console.log(compartment);
        nestedData.keys().forEach(function (timeStep) {
            nestedData.get(timeStep).get(selectedNode).get(compartment).keys().forEach(function (species) {
                if (!rememberSpecies.includes(species) && nestedData.get(timeStep).get(selectedNode).get(compartment).get(species) !== undefined && nestedData.get(timeStep).get(selectedNode).get(compartment).get(species) > 0) {
                    rememberSpecies.push(species);
                    reducedNodeData[compartment + "_" + species] = filterData(compartment, species);
                    nodeComponentCombinations.push(compartment + "_" + species);
                }
            })
        })
    })
}