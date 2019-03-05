//Global variables

//TODO globale Variablen überarbeiten!!

   const modalMargin = {top: 40, right: 20, bottom: 40, left: 100},
    modalWidth = 400 - modalMargin.left - modalMargin.right,
    modalHeight = 300 - modalMargin.top - modalMargin.bottom;


// set canvas of the graph
const margin = {top: 40, right: 50, bottom: 40, left: 50},
    width = parseInt(d3.select(".trajectory").style("width")) - margin.left - margin.right,
    height = parseInt(d3.select(".trajectory").style("height")) - margin.top - margin.bottom;

// scale the data to dimension of the graph
const x = d3.scaleLinear().range([0, width]);
var y0 = d3.scaleLinear().range([height, 0]);
var y1 = d3.scaleLinear().range([height, 0]);

const color = ['#e41a1c','#377eb8','#4daf4a','#984ea3','#ff7f00','#ffff33','#a65628','#f781bf','#999999'];
let color1 ="#4daf4a";
let color2 = "#a65628";
let summedData = [];
let activeTrajectories = [];
let time = [];
let compartments = [];
let species = [];
//let concentration = [];
let timeUnit = null;
let concentrationUnit = null;


let valueline1 =
    d3.line();

let valueline2 = d3.line();


let reader = new FileReader();

var globalData = null;

//read in the data from csv file
// define the svg element#

let svg = d3.select(".trajectory")
    .attr("id", "chart")
    .append("svg")
    .attr("width", width)//+ margin.left + margin.right
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", "-80 +80 " + (100 + parseInt(d3.select(".trajectory").style("width"))) + " " + parseInt(d3.select(".trajectory").style("height")))
    .attr("preserveAspectRatio", "xMidYMax meet")
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
//responsivefy(svg);
//label X-Axis
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height + 50)
    .attr("font-size", 20)
    .text("Elapsed time [ms]");

//label Y-Axis
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", -10)
    .attr("x", 130)
    .attr("font-size", 20)
    // .attr("dy", ".95em")
    //.attr("transform", "rotate(-90)")
    .text("Concentration [nmol/l]");

//define attributes of title
const boxDivWidth = parseInt(d3.select(".title").style("width"));
const boxDivHeight = parseInt(d3.select(".trajectory").style("height"));

let svgTitle = d3.select(".title")
    .attr("id", "boxSvg")
    .attr("width", boxDivWidth + margin.left + margin.right)
    .attr("height", boxDivHeight + margin.top + margin.bottom)
    .attr("viewBox", "0 0 " + parseInt(d3.select(".trajectory").style("width")) + " " + parseInt(d3.select(".trajectory").style("height")))
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

svgTitle.append("text")
    .attr("id", "titleOne")
    .attr("x", (boxDivWidth / 2))
    .attr("y", 0 - (margin.top / 1.5))
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text();

svgTitle.append("text")
    .text(" ––– ");


svgTitle.append("text")
    .attr("id", "titleTwo")
    .attr("x", (boxDivWidth / 2))
    .attr("y", 20 - (margin.top / 1.5))
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text();


//Functions


function loadFile() {
    var file = document.querySelector('input[type=file]').files[0];
    console.log(file);
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

/**
 * Can read csv files and convert time and concentration into integer.
 *
 * @param file file to be read out
 */
function readDataFromCsv() {
    console.log("csv");
    globalData = d3.csvParse(reader.result);

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




    prepareNestedData(globalData);
    prepareModal();
    addSelectionButtons();


}


/**
 *
 * travers over json file to nest the data.
 * recursive function
 *
 *
 *
 */
function readDataFromJson() {

    console.log("json!");
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
    addSelectionButtons();
    prepareModal();




}


/**
 *
 * Nest the data into a hierarchic structure. Only for csv files
 *
 * @param data Data from csv file
 */
function prepareNestedData(data) {

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


    console.log(nestedData);

}



/**
 * returns a array of objects with x (time) and y(conventration) data to create the Graph or filter concentration
 * @param compartment
 * @param species
 * @return {Array}
 */




function sumData (){



    let rememberSpecies = [];
    compartments.forEach(function (comp) {

        nestedData.keys().forEach(function (element) {

            nestedData.get(element).get(comp).keys().forEach(function (species) {


                if (!rememberSpecies.includes(species) && nestedData.get(element).get(comp).get(species) > 0) {

                    rememberSpecies.push(species);


                    //summedData.push(comp + "_" + species);

                    summedData[comp+"_"+species] = filterData(comp, species)

                    ;

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
    // console.log(trajektoryData);

    return trajektoryData;


}


function filterConcentration(compartment, species) {
    let concentration = [];


    if (compartment !== "Compartment" && species !== "Species") {

        nestedData.keys().forEach(function (element) {

            concentration.push(nestedData.get(element).get(compartment).get(species));
        });

        // console.log(concentration);
        return concentration;

    } else {
        concentration.push(0);
        return concentration;
    }

}


function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}


function prepareModal(){



    sumData();
    let iterator = 0;


console.log(summedData);

compartments.forEach(function (data) {
    let modDiv = d3.select("#modal_body")
        .append("div")
        .attr("id", "modal_body_" + data.split(" ").join("_"))
        .append("h2")
        .text(data);


});
for (let i in summedData){




let hlp = "";

console.log();

hlp = i.substr(0,i.indexOf("_"));
console.log(hlp);


    let modalSvg = d3.select("#modal_body_" + hlp.split(" ").join("_"))
        .append("svg")
        .attr("float", "left")
        .attr("width", modalWidth + modalMargin.left + modalMargin.right)
        .attr("height", modalHeight + modalMargin.top + modalMargin.bottom)
        .append("g")
        .attr("transform",
            "translate(" + modalMargin.left + "," + modalMargin.top + ")");

    modalSvg.append("text")
        .attr("x", (modalWidth / 2))
        .attr("y", 0 - (modalMargin.top / 2))
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("text-decoration", "underline")
        .text(i.substr(i.indexOf("_")+1));

    modalSvg.append("text")
        .attr("class", "x label")
        .attr("text-anchor", "end")
        .attr("x", (modalWidth/2)+20)
        .attr("y", modalHeight+30)
        .attr("font-size", 15)
        .text("[ms]");

//label Y-Axis
    modalSvg.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", -10)
        .attr("x", 30)
        .attr("font-size", 15)
        // .attr("dy", ".95em")
        //.attr("transform", "rotate(-90)")
        .text("[nmol/l]");


    var modalX = d3.scaleLinear()
        .domain(d3.extent(summedData[i], function(d) { return d.x; }))
        .range([ 0, modalWidth ]);

    modalSvg.append("g")
        .attr("transform", "translate(0," + modalHeight + ")")
        .call(d3.axisBottom(modalX).ticks(4));

//Add Y axis
    var modalY = d3.scaleLinear()
        .domain([0, d3.max(summedData[i], function(d) { return d.y; })])
        .range([ modalHeight, 0 ]);
    modalSvg.append("g")
        .call(d3.axisLeft(modalY).ticks(5));

    modalSvg.append("path")
        .datum(summedData[i])
        .attr("id", "line_" + iterator)
        .style("stroke", getRandomColor()) //$(".btn-outline-" + id + "_1").css("color")
        .attr("d", d3.line()
            .x(function (d) {

                return modalX(d.x);
            })
            .y(function (d) {
                return modalY(d.y);
            }));


iterator++;

}

}

/**
 *
 * Creates all elements required by the graph.
 *
 */

function prepareGraph() {

d3.selectAll("#line").remove();
d3.selectAll(".x.axis").remove();

    d3.selectAll(".y.axis.left").remove();
    d3.selectAll(".y.axis.right").remove();


    x.domain(d3.extent(time));
        setXAxis(svg);
        let iterator = 0;

        let data1= null;
        let data2 = null;

// console.log(activeTrajectories);
//
// if (activeTrajectories.length === 1
// ) {
//     let comp = activeTrajectories[0].split("_")[0];
//
//     let spec = activeTrajectories[0].split("_")[1];
//
//     y0.domain([0, d3.max(filterData(comp, spec), function (d) {
//
//         return d.y;
//     })]);
//
//     setOneYAxis(svg, "y axis right", color[1], filterData(comp, spec));
//
//     addLine(svg, filterData(comp, spec), color[1], "valueline1");
//
// }


    activeTrajectories.forEach(function (trajectory) {



        if (iterator === 0) {

            let comp = activeTrajectories[iterator].split("_")[0];

            let spec = activeTrajectories[iterator].split("_")[1];


            let data = filterData(comp, spec);

            d3.selectAll(".y.axis.left").remove();


            y0.domain([0, d3.max(data, function (d) {
                return d.y;
            })]);

            setOneYAxis(svg, "y axis left", color[iterator]);
            addLine(svg, data, color[iterator], "valueline1");
            title("#titleOne", trajectory, color[iterator])


        } else if (iterator === 1) {

            let comp = activeTrajectories[iterator].split("_")[0];

            let spec = activeTrajectories[iterator].split("_")[1];


            let data = filterData(comp, spec);

            d3.selectAll(".y.axis.right").remove();



            y1.domain([0, d3.max(data, function (d) {
                return d.y;
            })])
                .range([height, 0]);
            setOneYAxis(svg, "y axis right", color[iterator]);

            title("#titleTwo", trajectory, color[iterator]);

            addLine(svg, data, color[iterator]);
        }


iterator++
    })



}


/**
 *
 * Change the essential elements to plot the new data.
 * Data is read out again and then processed with various functions
 *
 * Dead at this moment
 */
function onChange() {
    // Add the valueline path.


    title();


    // Select the section we want to apply our changes to


    x.domain(d3.extent(time));


    //console.log(getTheRange("1"));

    if (compareRange(getTheRange("1"), getTheRange("2"))) {
        console.log("same axis");
        y0.domain([0, Math.max(getTheRange("1"), getTheRange("2"))]);
        // y.domain([0, 0]);

        // Make the changes

        changeLine("1", valueline1);
        changeLine("2", valueline1);
        changeAxis("1", "y axis left");
        changeAxis("2", "y axis right");


    } else {


        console.log("different axis");

        y0.domain([0, d3.max(filterConcentration(getTextOfBox("1_1"), getTextOfBox("1_2")))]);


        y1.domain([0, d3.max(filterConcentration(getTextOfBox("2_1"), getTextOfBox("2_2")))]);


        changeLine("1", valueline1);
        changeLine("2", valueline2);
        changeAxis("1", "y axis left");
        changeAxis("2", "y axis right");


    }


}

/**
 *
 *returns the maximum value of a trajectory
 *
 *@param nested_data nested data
 *@param id first number of id (1 or 2 instead of 1_1)
 *@returns scalemax
 *
 *
 * dead at this moment
 */
function getTheRange(id) {
    // determine text of selections

    const selectionSpecies = getTextOfBox(id + "_2");
    const selectionCompartment = getTextOfBox(id + "_1");

    // get maximal value of the data
    let data = filterData(selectionCompartment, selectionSpecies);
    return d3.max(data, function (d) {
        return d.y;
    });

//
//     for (let zzz = 0; zzz < nested_data.length; zzz++) {
//         if (nested_data[zzz].key === selectionSpecies) {
//             for (let xxx = 0; xxx < nested_data[zzz].values.length; xxx++) {
//                 if (nested_data[zzz].values[xxx].key === selectionCompartment) {
//                     return nested_data[zzz].values[xxx].value.scalemax;
//                 }
//             }
//         }
//     }
}


//TODO Speichern und löschen der Auswahl in einem Objekt. Linien imer anhand des Objekts erzeugen. Einfach immer neue Linien zeichnen
/**
 *
 *Creates Buttons to select Species in an Compartment.
 *
 */
function addSelectionButtons() {
    //Dropdown Box 1 Compartment
    //
    // let category = null;
    // let selection = null;
    let rememberSpecies = [];
    let iterator = 0;
    let colorIterator = 0;

    // console.log(nestedData);

//console.log(compartments);




    compartments.forEach(function (comp) {
        d3.select(".box")
            .append("div")
            .attr("id", comp.split(' ').join('_'))
            .attr("class", "list " + comp)
            .text(comp);

        nestedData.keys().forEach(function (element) {

            nestedData.get(element).get(comp).keys().forEach(function (species) {


                if (!rememberSpecies.includes(species) && nestedData.get(element).get(comp).get(species) > 0) {

                    rememberSpecies.push(species);


                    d3.select("#" + comp.split(' ').join('_'))
                        .append("div")
                        .attr("class", "col-md-4 center-block")
                        .append("button")
                        .attr("id", comp + "-" + species)
                        .attr("class", "btn btn-outline-secondary")
                        .attr("type", "button")
                        .text(species)
                        .on("click", function () {




                            let comp = this.id.split("-")[0];
                            let spec = this.id.split("-")[1];

                            if (activeTrajectories.length < 2 && $(this).attr("class") === "btn btn-outline-secondary"){



                                    activeTrajectories.push(comp + "_" + spec);

                                    $(this).toggleClass("active");

                                    prepareGraph();


                                    // $(this).css("background-color", color[colorIterator]);

                                    colorIterator++;

                                } else if ($(this).attr("class") === "btn btn-outline-secondary active") {


                                    // $(this).css("background-color", "#ffffff");

                                    $(this).removeClass('active');

                                    var index = activeTrajectories.indexOf(comp + "_" + spec);
                                    if (index > -1) {
                                        activeTrajectories.splice(index, 1);
                                    }
                                    colorIterator--;
                                    prepareGraph();
                                }


                                console.log(activeTrajectories);


                        });

                }

                iterator++;
            })


        })


    })

}


/**
 *
 * returns text of the selection as string
 *
 *@param id complete id (1_1)
 *@returns string
 */
function getTextOfBox(id) {

    return $("#btn-d" + id).text();

}



//TODO title Funktion überarbeiten (Titelbox vielleicht collapse machen)
/**
 *
 * change titles of the graphs
 *
 */
function title(name, data, color) {

    let svg = d3.select(".title").transition();

    svg
        .select(name)
        .styles({color: color})
        .text(data);


}


/**
 *
 * creates the x axis
 *
 *@param svg svg element
 */
function setXAxis(svg) {

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(d3.axisBottom(x))
        .attr("font-size", 15);
}




//TODO Y-Achsen management auf neuen Datenauswahl anpassen unbedingt. Funktion und Paramenter überarbeiten
/**
 *
 * creates one y axis based on the class name.
 * color and font are defined
 *
 * @param svg svg element
 * @param name class name of y axis
 * @param id first number of id (1 or 2 instead of 1_1)
 */
function setOneYAxis(svg, name, color, data) {

    if (name === "y axis right") {

        svg.append("g")
            .attr("class", name)
            .attr("transform", "translate(" + width + " ,0)")
            .attr("font-size", "20")
            .styles({
                fill: "none", stroke: color
                    ,
            })
            .call(d3.axisRight(y1))
            .attr("font-size", 17);


    } else if (name === "y axis left"){

        svg.append("g")
            .attr("class", name)
            .styles({
                fill: "none", stroke: color
                    ,
            })
            .call(d3.axisLeft(y0))
            .attr("font-size", 17);


    }
}

/**
 * Returns true, if both scales can be drawn on the same axis, and false otherwise.
 *
 * @param scalemax the first max
 * @param scalemax2 the second max
 * @returns {boolean} true, if both scales can be drawn on the same axis
 */
function compareRange(scalemax, scalemax2) {

    if (Math.abs(Math.log10(scalemax) - Math.log10(scalemax2)) < 0.6) {
        return true;
    }
}


//TODO Linien auf Object auswahl anpassen (Montag)
/**
 *
 * adds the svg element "line"
 *
 * @param svg svg element
 * @param data data from file
 * @param id first number of id (1 or 2 instead of 1_1)
 * @param val valueline which should be added
 */
function addLine(svg, data, color, name) {

//console.log(data);

    if (name === "valueline1") {
        svg.append("path")
            .datum(data)
            .attr("id", "line")
            .style("stroke", color)
            .attr("d", valueline1
                .x(function (d) {

                    return x(d.x);
                })
                .y(function (d) {
                    return y0(d.y);
                }));
    }else {

        svg.append("path")
            .datum(data)
            .attr("id", "line")
            .style("stroke", color)
            .attr("d", valueline2
                .x(function (d) {

                    return x(d.x);
                })
                .y(function (d) {
                    return y1(d.y);
                }));

    }

// var y = d3.scaleLinear()
//     .domain([0, d3.max(data, function(d) { return d.y; })])
//     .range([ height, 0 ]);
// svg.append("g")
//     .call(d3.axisLeft(y));

}



//TODO Klar werden ob man diese Methode noch braucht
/**
 *
 * change the data of a selected valueline
 *
 * @param id first number of id (1 or 2 instead of 1_1)
 * @param val valueline which schould be changed
 * @param data data from file
 */
function changeLine(id, val) {

    let data = filterConcentration(getTextOfBox(id + "_1"), getTextOfBox(id + "_2"));

    let svg = d3.select("body").transition();
    svg.select("#line" + id)   // change the line
        .duration(750)
        .attr("d", val(data));


}

//TODO anpassen auf neue Datenstruktur
/**
 *
 * rearrange the values for the y axis
 *
 * @param id first number of id (1 or 2 instead of 1_1)
 * @param name class name of axis
 */
function changeAxis(id, name) {

    let svg = d3.select("body").transition();

    if (name === "y axis left") {
        svg.select(".y.axis.left") // change the y axis
            .duration(750)
            .styles({
                fill: "none", stroke: $(".btn-outline-" + id + "_1")
                    .css("color"), "stroke-width": "0.3"
            })
            .call(d3.axisLeft(y0));
    } else {


        svg.select(".y.axis.right") // change the y axis
            .duration(750)
            .styles({
                fill: "none", stroke: $(".btn-outline-" + id + "_1")
                    .css("color"), "stroke-width": "0.5"
            })
            .call(d3.axisRight(y1));

    }


}


//TODO Automatische Farbzuweisung (außer gelb)

//TODO alle Graphen die nicht 0 sind anzeigen lassen (Wie in R)

//TODO Reguläre ausdrücke durch Eingabe realisieren

//TODO Auswahl durch regüläre ausdrücke. Summierung von trajektiren. Vielleicht mit D3?

//TODO Konfidenzintervalle


