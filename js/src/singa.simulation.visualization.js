//Global variables

const modalMargin = {top: 40, right: 20, bottom: 40, left: 100},
    modalWidth = 400 - modalMargin.left - modalMargin.right,
    modalHeight = 300 - modalMargin.top - modalMargin.bottom;

const margin = {top: 40, right: 50, bottom: 40, left: 50},
    width = parseInt(d3.select(".trajectory").style("width")) - margin.left - margin.right,
    height = parseInt(d3.select(".trajectory").style("height")) - margin.top - margin.bottom;

const boxDivWidth = parseInt(d3.select(".titleDiv").style("width")),
      boxDivHeight = parseInt(d3.select(".trajectory").style("height"));

const color = ['#1b9e77','#d95f02','#7570b3','#e7298a','#66a61e'];

const x = d3.scaleLinear().range([0, width]);
let y0 = d3.scaleLinear().range([height, 0]),
    y1 = d3.scaleLinear().range([height, 0]);

let summedData = [],
 activeTrajectories = [],
 time = [],
 compartments = [],
 species = [],
 timeUnit = null,
 concentrationUnit = null,
 reader = new FileReader(),
 globalData = null,
 valueline1 = d3.line(),
 svgMain,
 svgTitle,
 modalSvg;

//Functions to read and structure the data into a uniform data format (nestedData)



function resetGlobalArrays(){
    activeTrajectories.length = 0;
    time.length = 0;
    compartments.length = 0;
    species.length = 0;
}

function btnAllTrajectoriesVisible() {
    $("#multiCharts").removeClass("invisible");
    $("#multiCharts").toggleClass("visible");
}

function clearHtmlTags(){
    d3.select("#modal_body").html("");
    d3.select("#modal_body").selectAll("*").remove();
    d3.select(".titleDiv").html("");
    d3.select(".trajectory").html("");
    d3.select(".box").html("");
}

function loadExampleCsv(){

    resetGlobalArrays();
    btnAllTrajectoriesVisible();
    clearHtmlTags();

    d3.csv("js/src/example_trajectories.csv", function(data){
        globalData=data;
    });
    setTimeout(function(){
        console.log(globalData);
        prepareDataFromCsv();
        prepareNestedDataFromCsv(globalData);
        initializeMainContent();
    },200);
}

function loadExampleJson(){

    resetGlobalArrays();
    btnAllTrajectoriesVisible();
    clearHtmlTags();

    // d3.json("/data/employees.json").then(function(data) {
    //     console.log(data[0]);
    // });

    d3.json("js/src/example_trajectories.json", function(data){
        globalData=data;
    });
    setTimeout(function(){
        nestedData = d3.map();

        let currentTime;
        let currentCompartment;
        let parent;

        function traverse(data) {
            for (let currentKey in data) {

                if (data[currentKey] !== null) {
                    if (typeof(data[currentKey]) === "object") {

                        if (parent === "trajectory-data") {
                            currentTime = currentKey;
                            if (!time.includes(currentKey)) {
                                time.push(parseFloat(currentKey));
                                nestedData.set(currentKey, d3.map())
                            }
                        }

                        if (parent === "concentrations") {
                            currentCompartment = currentKey;
                            if (!compartments.includes(currentKey)) {
                                compartments.push(currentKey);
                            }
                            nestedData.get(currentTime).set(currentCompartment, d3.map())
                        }
                        const grandparent = parent;
                        parent = currentKey;
                        traverse(data[currentKey]);
                        parent = grandparent;

                    } else {

                        if (currentKey === "time-unit") {

                            timeUnit = data[currentKey];

                        } else if (currentKey === "concentration-unit") {

                            concentrationUnit = data[currentKey]
                        } else {
                            if (!species.includes(currentKey)) {
                                species.push(currentKey);
                            }
                            nestedData.get(currentTime).get(currentCompartment).set(currentKey, data[currentKey]);
                        }
                    }
                }
            }
        }

        traverse(globalData);
        initializeMainContent();

    },200);
}

function loadFile() {

resetGlobalArrays();
btnAllTrajectoriesVisible();
clearHtmlTags();

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

function readDataFromCsv() {
    globalData = d3.csvParse(reader.result);
console.log(globalData);
    prepareDataFromCsv();
    prepareNestedDataFromCsv(globalData);
    initializeMainContent();
}

function prepareDataFromCsv(){
    globalData.forEach(function (d) {
        d.elapsed_time = +d["elapsed time"];
        d.concentration = +d.concentration;

        if (!time.includes(d.elapsed_time)) {
            time.push(d.elapsed_time)
        }

        if (!compartments.includes(d.compartment)) {
            compartments.push(d.compartment)
        }

        if (!species.includes(d.species)) {
            species.push(d.species)
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

    let currentTime;
    let currentCompartment;
    let parent;

    function traverse(data) {
        for (let currentKey in data) {

            if (data[currentKey] !== null) {
                if (typeof(data[currentKey]) === "object") {

                    if (parent === "trajectory-data") {
                        currentTime = currentKey;
                        if (!time.includes(currentKey)) {
                            time.push(parseFloat(currentKey));
                            nestedData.set(currentKey, d3.map())
                        }
                    }

                    if (parent === "concentrations") {
                        currentCompartment = currentKey;
                        if (!compartments.includes(currentKey)) {
                            compartments.push(currentKey);
                        }
                        nestedData.get(currentTime).set(currentCompartment, d3.map())
                    }
                    const grandparent = parent;
                    parent = currentKey;
                    traverse(data[currentKey]);
                    parent = grandparent;

                } else {

                    if (currentKey === "time-unit") {

                        timeUnit = data[currentKey];

                    } else if (currentKey === "concentration-unit") {

                        concentrationUnit = data[currentKey]
                    } else {
                        if (!species.includes(currentKey)) {
                            species.push(currentKey);
                        }
                        nestedData.get(currentTime).get(currentCompartment).set(currentKey, data[currentKey]);
                    }

                }


            }

        }


    }

    traverse(globalData);
    initializeMainContent();


}

function initializeMainContent() {

    addSelectionButtons();
    initialMainSvg();
    prepareModal()

}

function sumData() {

    let rememberSpecies = [];
    compartments.forEach(function (comp) {

        nestedData.keys().forEach(function (element) {

            nestedData.get(element).get(comp).keys().forEach(function (species) {

                if (!rememberSpecies.includes(species) && nestedData.get(element).get(comp).get(species) > 0) {

                    rememberSpecies.push(species);
                    summedData[comp + "_" + species] = filterData(comp, species);

                }
            })
        })
    })
}

function filterData(compartment, species) {

    let trajektoryData = [];
    let obj = {};

    nestedData.keys().forEach(function (element) {
        if (nestedData.get(element).get(compartment).get(species) === undefined) {
            obj = {
                //  name: compartment+ "_" + species,
                x: parseFloat(element),
                y: 0
            };
            trajektoryData.push(obj);
        } else {
            obj = {
                // name: compartment+ "_" + species,
                x: parseFloat(element),
                y: nestedData.get(element).get(compartment).get(species)
            };
            trajektoryData.push(obj);
        }
    });
    return trajektoryData;
}

// Functions to display all trajectories in a modal

function prepareModal() {

    let modalIterator = 0;
    let compart;
    let title;
    let selector;
    sumData();

    compartments.forEach(function (comp) {
        let modDiv = d3.select("#modal_body")
            .append("div")
            .attr("id", "modal_body_" + compartments.indexOf(comp))
            .append("h2")
            .text(comp);


    });

    for (let i in summedData) {
        compart = i.substr(0, i.indexOf("_"));
        selector= "#modal_body_" + compartments.indexOf(compart);
        title= i.substr(i.indexOf("_") + 1);
        defineModalSvg(selector,title);
        defineModalAxes(i, modalIterator);
        modalIterator++;
    }
}

function defineModalSvg(selector, text) {

    modalSvg = d3.select(selector)
        .append("svg")
        .attr("float", "left")
        .attr("width", modalWidth + modalMargin.left + modalMargin.right)
        .attr("height", modalHeight + modalMargin.top + modalMargin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + modalMargin.left + "," + modalMargin.top + ")");

    modalSvg.append("text")
        .attr("x", (modalWidth / 2))
        .attr("y", 0 - (modalMargin.top/ 1.5))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text(text);

    modalSvg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", (modalWidth / 2) + 20)
        .attr("y", modalHeight + 30)
        .attr("font-size", 15)
        .text("[ms]");

//label Y-Axis
    modalSvg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", -10)
        .attr("x", 30)
        .attr("font-size", 15)
        .text("[nmol/l]");

}

function defineModalAxes(i, modalIterator){
    let modalX = d3.scaleLinear()
        .domain(d3.extent(summedData[i], function (d) {
            return d.x;
        }))
        .range([0, modalWidth]);



    modalSvg.append("g")
        .attr("transform", "translate(0," + modalHeight + ")")
        .call(d3.axisBottom(modalX).ticks(4));

//Add Y axis
    let modalY = d3.scaleLinear()
        .domain([0, d3.max(summedData[i], function (d) {
            return d.y;
        })])
        .range([modalHeight, 0]);
    modalSvg.append("g")
        .call(d3.axisLeft(modalY).ticks(5));

    modalSvg.append("path")
        .datum(summedData[i])
        .attr("id", "line_" + modalIterator)
        .style("stroke", getRandomColor())
        .attr("d", d3.line()
            .x(function (d) {

                return modalX(d.x);
            })
            .y(function (d) {
                return modalY(d.y);
            }));
}

// Functions to create elements that display the title of the trajectories.

function setTitleBox() {
    svgTitle=  d3.select(".titleDiv")
        .attr("id", "boxSvg")
        .attr("width", boxDivWidth + margin.left + margin.right)
        .attr("height", boxDivHeight + margin.top + margin.bottom)
        .attr("viewBox", "0 0 " + parseInt(d3.select(".trajectory").style("width")) + " " + parseInt(d3.select(".trajectory").style("height")))
        .attr("preserveAspectRatio", "xMidYMid meet")
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`);

    defineTitleElement();
}

function defineTitleElement(){

    svgTitle.append("text")
        .attr("class","label title one")
        .attr("id", "titleOne")
        .attr("x", (boxDivWidth / 2))
        .attr("y", 0 - (margin.top / 1.5))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text();

    svgTitle.append("text")
        .attr("class","label title spacer")
        .text(" ––– ");

    svgTitle.append("text")
        .attr("class","label title two")
        .attr("id", "titleTwo")
        .attr("x", (boxDivWidth / 2))
        .attr("y", 20 - (margin.top / 1.5))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text();

    setTitle();
}

function setTitle(){

    svgTitle.select("#titleOne")
        .styles({color: color[0]})
        .text(activeTrajectories[0]);

    svgTitle.select("#titleTwo")
        .styles({color: color[1]})
        .text(activeTrajectories[1]);


}

// Functions to create buttons and their click events and how to create the ID and get data from the ID

function addSelectionButtons() {

    let rememberSpecies = [];

    compartments.forEach(function (comp) {
        d3.select(".box")
            .append("div")
            .attr("id", "compartment_" + compartments.indexOf(comp))
            .attr("class", "list " + comp)
            .append("h4")
            .text (comp);

        nestedData.keys().forEach(function (element) {
            nestedData.get(element).get(comp).keys().forEach(function (buttonSpecies) {
                if (!rememberSpecies.includes(buttonSpecies) && nestedData.get(element).get(comp).get(buttonSpecies) > 0) {
                    rememberSpecies.push(buttonSpecies);

                    d3.select("#compartment_" + compartments.indexOf((comp)))
                        .append("div")
                        .attr("class", "col-md-4 center-block")
                        .append("button")
                        .attr("id", getId(comp, buttonSpecies))
                        .attr("class", "btn btn-outline-secondary")
                        .attr("type", "button")
                        .text(buttonSpecies)
                        .on("click", function(){clickButton(this.id)});
                }
            })
        })
    })
}

function clickButton(id){

    if (activeTrajectories.length < 2 && $("#"+id).attr("class") === "btn btn-outline-secondary"){
        addLineOnClick(id);
    } else if ($("#"+id).attr("class") === "btn btn-outline-secondary active") {
        removeLineOnClick(id)

    }

}

function addLineOnClick(id){
    activeTrajectories.push(getCompartmentFromId(id) + "_" + getSpeciesFromId(id));
    $("#"+id).toggleClass("active");
    prepareGraph();
}

function removeLineOnClick(id) {
    $("#" + id + ".btn-outline-secondary.active").removeAttr("style");
    $("#"+ id).removeClass('active');
    //  $("#" + id + ".btn-outline-secondary:hover").css("background-color", "#6c757d");
    let index = activeTrajectories.indexOf(getCompartmentFromId(id) + "_" + getSpeciesFromId(id));
    if (index > -1) {
        activeTrajectories.splice(index, 1);
    }
    // $("#" + id));
    prepareGraph();
}

function getSpeciesFromId(id) {

    return species[parseInt(id.split("_")[1])]

}

function getCompartmentFromId(id) {

    return compartments[parseInt(id.split("_")[0])]

}

function getId(selectedComp, selectedSpecies) {
    return  compartments.indexOf(selectedComp) + "_" + species.indexOf(selectedSpecies)
}

//Functions that organize the main window. Create coordinate system and draw the trajectories.

function initialMainSvg() {
    svgMain = d3.select(".trajectory")
        .attr("id", "chart")
        .append("svg")
        .attr("width", width)//+ margin.left + margin.right
        .attr("height", height + margin.top + margin.bottom)
        .attr("viewBox", "-80 +80 " + (100 + parseInt(d3.select(".trajectory").style("width"))) + " " + parseInt(d3.select(".trajectory").style("height")))
        .attr("preserveAspectRatio", "xMidYMax meet")
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
}

function removeElementsOfSvg() {
    d3.selectAll("#line").remove();
    d3.selectAll("#titleOne").remove();
    d3.selectAll("#titleTwo").remove();
    d3.selectAll(".x.axis").remove();
    d3.selectAll(".y.axis.left").remove();
    d3.selectAll(".y.axis.right").remove();
    d3.selectAll(".label").remove();
}

function prepareGraph() {
    let iterator = 0;

    removeElementsOfSvg();
    labelAxis();
    setTitleBox();

    x.domain(d3.extent(time));
    setXAxis();

    activeTrajectories.forEach(function () {

        let comp = activeTrajectories[iterator].split("_")[0];
        let spec = activeTrajectories[iterator].split("_")[1];
        let data = filterData(comp, spec);
        let id   = getId(comp,spec);
        if (iterator === 0) {
            y0.domain([0, d3.max(data, function (d) {
                return d.y;
            })]);
            setYAxis("y axis left", color[iterator]);
            addLine(data, color[iterator], "valueline1");
            $("#" + id + ".btn-outline-secondary:not(:disabled):not(.disabled).active").css("background-color", color[iterator]);

        } else if (iterator === 1) {
            y1.domain([0, d3.max(data, function (d) {
                return d.y;
            })])
                .range([height, 0]);
            setYAxis("y axis right", color[iterator]);
            addLine(data, color[iterator]);
            $("#" + id + ".btn-outline-secondary:not(:disabled):not(.disabled).active").css("background-color", color[iterator]);
        }
        iterator++
    })
}

function labelAxis(){
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
        .attr("class", name)

    if (name === "y axis right") {

        d3.select(".y.axis.right").attr("transform", "translate(" + width + " ,0)")
            .call(d3.axisRight(y1))
            .styles({
            fill: "none", stroke: color
        })
            .attr("font-size", 17);

    } else if (name === "y axis left") {

         d3.select(".y.axis.left")
            .call(d3.axisLeft(y0))
             .styles({
             fill: "none", stroke: color
         })
            .attr("font-size", 17);
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
                    if (name === "valueline1"){
                    return y0(d.y);
                    }else{
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



