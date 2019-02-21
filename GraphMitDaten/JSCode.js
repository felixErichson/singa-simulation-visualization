// set canvas of the graph
const margin = {top: 40, right: 50, bottom: 40, left: 50},
    width = parseInt(d3.select(".trajectory").style("width")) - margin.left - margin.right,
    height = parseInt(d3.select(".trajectory").style("height")) - margin.top - margin.bottom;

// scale the data to dimension of the graph
const x = d3.scaleLinear().range([0, width]);
var y0 = d3.scaleLinear().range([height, 0]);
var y1 = d3.scaleLinear().range([height, 0]);


// define the trajectories
const valueline1 =
    d3.line()
        .x(function (d) {
            // console.log(x(d.elapsed_time));
            return x(d.elapsed_time);
        })
        .y(function (d) {
            return y0(d.concentration);
        });

const valueline2 =
    d3.line()
        .x(function (d) {
            return x(d.elapsed_time);
        })
        .y(function (d) {
            return y1(d.concentration);
        });

let reader = new FileReader();

var globalData = null;

//read in the data from csv file
// define the svg element


let svg = d3.select(".trajectory")
    .attr("id", "chart")
    .append("svg")
    // .attr("xmlns", "http://www.w3.org/2000/svg")
    .attr("width", width  )//+ margin.left + margin.right
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", "-80 0 " + (100 +parseInt(d3.select(".trajectory").style("width")) ) + " " + parseInt(d3.select(".trajectory").style("height")))
    .attr("preserveAspectRatio", "xMidYMid meet")
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);
responsivefy(svg);
//label X-Axis
svg.append("text")
    .attr("class", "x label")
    .attr("text-anchor", "end")
    .attr("x", width)
    .attr("y", height + 30)
    .text("Elapsed time [ms]");

//label Y-Axis
svg.append("text")
    .attr("class", "y label")
    .attr("text-anchor", "end")
    .attr("y", -10)
    .attr("x", 130)
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


//read the data from a CSV file to work with them

//Functions

function loadFile() {
    var file = document.querySelector('input[type=file]').files[0];
    console.log(file);
    reader = new  FileReader();
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
 *
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
    });

    // globalData = data;
    prepareNestedData(globalData);
    prepareGraph();
}

function readDataFromJson() {
    console.log("json!")
}

/**
 *
 * Nest the data into a hierarchic structure.
 *
 * @param data Data which were read out
 */
function prepareNestedData(data) {


    nested_data = d3.nest()
        .key(function (d) {
            return d.species;
        })
        .key(function (d) {
            return d.compartment;
        })
        .rollup(function (d) {
            d.scalemin = d3.min(d, function (d) {
                return d.concentration
            });

            d.scalemax = d3.max(d, function (d) {
                return d.concentration;
            });
            return d;
        })
        .entries(data);

}

/**
 *
 * Creates all elements required by the graph.
 *
 * @param globalData Data which were read out
 */

function prepareGraph() {

//Add choice boxes
    addChoiceBox("1", globalData);
    addChoiceBox("2", globalData);


// Add the X Axis
    x.domain(d3.extent(globalData, function (d) {
        return d.elapsed_time;
    }));

    setXAxis(svg);

// Define the Y Axis and the valuelines. If statement for matching datarange
    if (compareRange(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))) {

        // Add the Y Axis
        y0.domain([0, Math.max(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))]);

        setOneYAxis(svg, "y axis left");


        addLine(svg, globalData, "1", valueline1);
        addLine(svg, globalData, "2", valueline1);

    } else {


// Else Statement when the ranges are different--------------------------------------------------

        // Add the Y Axis
        y0.domain([0, d3.max(globalData.filter(function (d) {
            return d.species === getTextOfBox("1_2") && d.compartment === getTextOfBox("1_1")
        }), function (d) {
            return d.concentration
        })]);


        y1.domain([0, d3.max(globalData.filter(function (d) {
            return d.species === getTextOfBox("2_2") && d.compartment === getTextOfBox("2_1")
        }), function (d) {
            return d.concentration
        })]);

        setOneYAxis(svg, "y axis left", "1");
        setOneYAxis(svg, "y axis right", "2");

        addLine(svg, globalData, "1", valueline1);
        addLine(svg, globalData, "2", valueline2);


    }
}


/**
 *
 * Change the essential elements to plot the new data.
 * Data is read out again and then processed with various functions
 */
function onChange() {
    // Add the valueline path.


    title();


    // Select the section we want to apply our changes to


    x.domain(d3.extent(globalData, function (d) {
        return d.elapsed_time;
    }));


    console.log(getTheRange(nested_data, "1"));

    if (compareRange(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))) {
        console.log("same axis");
        y0.domain([0, Math.max(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))]);
        // y.domain([0, 0]);

        // Make the changes

        changeLine("1", valueline1, globalData);
        changeLine("2", valueline1, globalData);
        changeAxis("1", "y axis left");
        changeAxis("2", "y axis right");


    } else {
        console.log("different axis");

        y0.domain([0, d3.max(globalData.filter(function (d) {
            return d.species === getTextOfBox("1_2") && d.compartment === getTextOfBox("1_1")
        }), function (d) {
            return d.concentration
        })]);


        y1.domain([0, d3.max(globalData.filter(function (d) {
            return d.species === getTextOfBox("2_2") && d.compartment === getTextOfBox("2_1")
        }), function (d) {
            return d.concentration
        })]);


        changeLine("1", valueline1, globalData);
        changeLine("2", valueline2, globalData);
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
 */
function getTheRange(nested_data, id) {
    // determine text of selections
    const selectionSpecies = getTextOfBox(id + "_2");
    const selectionCompartment = getTextOfBox(id + "_1");
    // get maximal value of the data
    for (let zzz = 0; zzz < nested_data.length; zzz++) {
        if (nested_data[zzz].key === selectionSpecies) {
            for (let xxx = 0; xxx < nested_data[zzz].values.length; xxx++) {
                if (nested_data[zzz].values[xxx].key === selectionCompartment) {
                    return nested_data[zzz].values[xxx].value.scalemax;
                }
            }
        }
    }
}


/**
 *
 * Function to add the choice boxes. At first the data were nested to realize the selection of species and compartment.
 * Then the select items were created in bootstraps style for species and compartment
 * At least the data which can be selected were added.
 *
 *@param id first number of id (1 or 2 instead of 1_1)
 *@param data data from file
 */
function addChoiceBox(id, data) {
    //Dropdown Box 1 Compartment

    let category = null;
    let selection = null;


    // Nest the data to select species or compartment
    const compartmentSelection = d3.nest()
        .key(function (d) {
            return d.compartment;
        })
        .rollup(function (v) {
            return v.length;
        })
        .entries(data);


    const speciesSelection = d3.nest()
        .key(function (d) {
            return d.species;
        })
        .rollup(function (v) {
            return v.length;
        })
        .entries(data);


// for loop to create choiceboxes

    for (let i = 1; i < 3; i++) {

        if (i === 1) {
            category = "Compartment"
        } else if (i === 2) {
            category = "Species"
        }

        if (i === 1) {
            selection = compartmentSelection;
        } else if (i === 2) {
            selection = speciesSelection;
        }

        d3.select(".box")
            .append("div")
            .attr("class", "selection" + id + "_" + i)
            .style("position", "relative")
            .style("align", "center")
            .style("float", "center")
            .append("div")
            .attr("id", "Tablediv" + id + "_" + i)
            .attr("class", "dropdown")
            .append("button")
            .attr("id", "btn-d" + id + "_" + i)
            .attr("class", "btn btn-outline-" + id + "_" + i)
            .attr("type", "button")
            .attr("data-toggle", "dropdown")
            .text(category)
            .append("span")
            .attr("class", "caret");

        realizeList(selection, id, i);


        updateGraph("#TableMenu" + id + "_" + i, "#btn-d" + id + "_" + i);
    }


}

function realizeList(selection, firstId, secondId) {

    let ulHelp =
        d3.select("#Tablediv" + firstId + "_" + secondId)
            .append("ul")
            .attr("id", "TableMenu" + firstId + "_" + secondId)
            .attr("class", "dropdown-menu");


    for (let j = 0; j < selection.length; j++) {

        ulHelp
            .append("li")
            .append("a")
            .attr("href", "#")
            .text(selection[j].key)
    }


}

/**
 *
 *update the text of boxes and perform onChange
 *
 *@param tabMenu id (#) of TableMenu
 *@param buttonName id (#) of the button which should read out
 *@returns selTex the selection as string
 *
 */
function updateGraph(tabMenu, buttonName) {

    $(tabMenu + " a").click(function (e) {
        e.preventDefault();
        let selText = $(this).text();
        $(buttonName).text(selText);
        onChange();
        //console.log(selText);
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


/**
 *
 * change titles of the graphs
 *
 */
function title() {

    let svg = d3.select(".title").transition();

    svg
        .select("#titleOne")
        .styles({color: $(".btn-outline-1_1").css("color")})
        .text(getTextOfBox("1_1") + ":" + getTextOfBox("1_2"));

    svg
        .select("#titleTwo")
        .styles({color: $(".btn-outline-2_1").css("color")})
        .text(getTextOfBox("2_1") + ":" + getTextOfBox("2_2"));

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
        .call(d3.axisBottom(x));
}


/**
 *
 * creates one y axis based on the class name.
 * color and font are defined
 *
 * @param svg svg element
 * @param name class name of y axis
 * @param id first number of id (1 or 2 instead of 1_1)
 */
function setOneYAxis(svg, name, id) {

    if (name === "y axis right") {
        svg.append("g")
            .attr("class", name)
            .attr("transform", "translate(" + width + " ,0)")
            .styles({
                fill: "none", stroke: $(".btn-outline-" + id + "_1")
                    .css("color"), "stroke-width": "0.5"
            })
            .call(d3.axisRight(y0));
    } else {

        svg.append("g")
            .attr("class", name)
            .styles({
                fill: "none", stroke: $(".btn-outline-" + id + "_1")
                    .css("color"), "stroke-width": "0.5"
            })
            .call(d3.axisLeft(y1));
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

/**
 * fits the coordinate system to the screen
 *
 */
function responsivefy(svg) {
    // get container + svg aspect ratio
    let container = d3.select(".trajectory"),
        width = parseInt(container.style("width")),
        height = parseInt(container.style("height")),
        aspect = width / height;

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .call(resize);

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    // d3.select(window).on("resize." + container.attr("id"), resize);

    // get width of container and resize svg to fit it
    function resize() {
        let targetWidth = parseInt(container.style("width"));
        svg.attr("width", targetWidth);
        svg.attr("height", Math.round(targetWidth / aspect));
    }
}

/**
 *
 * adds the svg element "line"
 *
 * @param svg svg element
 * @param data data from file
 * @param id first number of id (1 or 2 instead of 1_1)
 * @param val valueline which should be added
 */
function addLine(svg, data, id, val) {
    svg.append("path")
        .data([data])
        .attr("id", "line" + id)
        .style("stroke", $(".btn-outline-" + id + "_1").css("color"))
        .attr("d", val(data.filter(function (d) {
            return d.species === getTextOfBox(id + "_2") && d.compartment === getTextOfBox(id + "_1")
        })));

}

/**
 *
 * change the data of a selected valueline
 *
 * @param id first number of id (1 or 2 instead of 1_1)
 * @param val valueline which schould be changed
 * @param data data from file
 */
function changeLine(id, val, data) {


    let svg = d3.select("body").transition();
    svg.select("#line" + id)   // change the line
        .duration(750)
        .attr("d", val(data.filter(function (d) {
            return d.species === getTextOfBox(id + "_2") && d.compartment === getTextOfBox(id + "_1")
        })));


}


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

// function handleFileSelect(evt) {
//     var files = evt.target.files; // FileList object
//
//     // files is a FileList of File objects. List some properties.
//     var output = [];
//     for (var i = 0, f; f = files[i]; i++) {
//         output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',
//             f.size, ' bytes, last modified: ',
//             f.lastModifiedDate.toLocaleDateString(), '</li>');
//     }
//     document.getElementById('list').innerHTML = '<ul>' + output.join('') + '</ul>';
// }
//
// document.getElementById('files').addEventListener('change', handleFileSelect, false);


//Handle file selection bar


// We can watch for our custom `fileselect` event like this


// $(function() {
//
//     // We can attach the `fileselect` event to all file inputs on the page
//     $(document).on('change', ':file', function() {
//         var input = $(this),
//             numFiles = input.get(0).files ? input.get(0).files.length : 1,
//             label = input.val().replace(/\\/g, '/').replace(/.*\//, '');
//         input.trigger('fileselect', [numFiles, label]);
//
//         $('input[type=file]').change(function () {
//             console.log(this.files[0].mozFullPath);
//         });
//
//
//
//
//       // console.log($("file-upload").attr("src"));
//
//
//          //   $(".box").empty();
//
//
//
//
//     });
//     $(document).ready( function() {
//
//         $(':file').on('fileselect', function(event, numFiles, label) {
//
//             var input = $(this).parents('.input-group').find(':text'),
//                 log = numFiles > 1 ? numFiles + ' files selected' : label;
//             if( input.length ) {
//                 input.val(log);
//
//             } else {
//                 if( log ) alert(log);
//             }
//
//         });
//     });
//
// });
