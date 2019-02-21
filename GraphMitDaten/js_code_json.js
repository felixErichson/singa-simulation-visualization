
// set canvas of the graph
const margin = {top: 40, right: 50, bottom: 40, left: 50},
    width = 700 - margin.left - margin.right,
    height = 300 - margin.top - margin.bottom;

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


// define the svg element
const svg = d3.select(".test")
    .attr("id", "chart")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", "0 0 " + width + " " + height)
    .call(responsivefy)
    .append('g')
    .attr('transform', `translate(${margin.left}, ${margin.top})`);

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
    .attr("y", -50)
    .attr("x", -30)
    .attr("dy", ".95em")
    .attr("transform", "rotate(-90)")
    .text("Conctration [nmol/l");

//define attributes of title
svg.append("text")
    .attr("id", "titleOne")
    .attr("x", (width / 2))
    .attr("y", 0 - (margin.top / 1.5))
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text();


svg.append("text")
    .attr("id", "titleTwo")
    .attr("x", (width / 2))
    .attr("y", 20 - (margin.top / 1.5))
    .attr("text-anchor", "middle")
    .style("font-size", "16px")
    .style("text-decoration", "underline")
    .text();



//read the data from a CSV file to work with them
// d3.json("trajectory.json", function (error, data) {
//     if (error) throw error;
//
//
//     Object.entries(data["trajectory-data"]).forEach(function (d) {
//         d.concentration  = Object.keys(data["trajectory-data"]);
//
//     });
//     console.log(d.concentration);


d3.json("trajectory.json", function (data) {
    console.log(data);




    // Nest the Data to get a better overview and rearrange the data
    // nested_data = d3.nest()
    //     .key(function (d) {
    //         return d.species;
    //     })
    //     .key(function (d) {
    //         return d.compartment;
    //     })
    //     .rollup(function (d) {
    //         d.scalemin = d3.min(d, function (d) {
    //             return d.concentration
    //         });
    //
    //         d.scalemax = d3.max(d, function (d) {
    //             return d.concentration;
    //         });
    //         return d;
    //     })
    //
    //     .entries(data);
    //
    // console.log(nested_data);
    // console.log(nested_data[1].values[1].value.scalemax);



    //Add choice boxes
    addChoiceBox("1", data);
    addChoiceBox("2", data);


    // Add the X Axis
    x.domain(d3.extent(data, function (d) {
        return d.elapsed_time;
    }));

    setXAxis(svg);

    // Define the Y Axis and the valuelines. If statement for matching datarange
    if (compareRange(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))) {

        // Add the Y Axis
        y0.domain([0, Math.max(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))]);

        setOneYAxis(svg, "y axis left");


        addLine(svg, data, "1", valueline1);
        addLine(svg, data, "2", valueline1);

    } else {


// Else Statement when the ranges are different--------------------------------------------------

        // Add the Y Axis
        y0.domain([0, d3.max(data.filter(function (d) {
            return d.species === getSelection("1_2") && d.compartment === getSelection("1_1")
        }), function (d) {
            return d.concentration
        })]);


        y1.domain([0, d3.max(data.filter(function (d) {
            return d.species === getSelection("2_2") && d.compartment === getSelection("2_1")
        }), function (d) {
            return d.concentration
        })]);

        setOneYAxis(svg, "y axis left", "1");
        setOneYAxis(svg, "y axis right", "2");

        addLine(svg, data, "1", valueline1);
        addLine(svg, data, "2", valueline2);


    }


});


//Functions


/**
 *
 * Change the essential elements to plot the new data.
 * Data is read out again and then processed with various functions
 */
function onChange() {
    // Add the valueline path.


    d3.csv("node_(0, 0)_concentrations.csv", function (error, data) {
        data.forEach(function (d) {

            d.elapsed_time = +d.elapsed_time;
            d.concentration = +d.concentration;

        });



        title();


        // Select the section we want to apply our changes to


        x.domain(d3.extent(data, function (d) {
            return d.elapsed_time;
        }));


        console.log(getTheRange(nested_data, "1"));

        if (compareRange(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))) {
            console.log("same axis");
            y0.domain([0, Math.max(getTheRange(nested_data, "1"), getTheRange(nested_data, "2"))]);
            // y.domain([0, 0]);

            // Make the changes

            changeLine("1", valueline1, data);
            changeLine("2", valueline1, data);
            changeAxis("1", "y axis left");
            changeAxis("2", "y axis right");


        } else {
            console.log("different axis");

            y0.domain([0, d3.max(data.filter(function (d) {
                return d.species === getSelection("1_2") && d.compartment === getSelection("1_1")
            }), function (d) {
                return d.concentration
            })]);


            y1.domain([0, d3.max(data.filter(function (d) {
                return d.species === getSelection("2_2") && d.compartment === getSelection("2_1")
            }), function (d) {
                return d.concentration
            })]);


            changeLine("1", valueline1, data);
            changeLine("2", valueline2, data);
            changeAxis("1", "y axis left");
            changeAxis("2", "y axis right");


        }

    });


}


/**
 *
 * returns text of the selection as string
 *
 *@param id complete id (1_1)
 *@returns string
 */
function getSelection(id){

    return $("#btn-d" +id ).text();

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



    for (let zzz = 0; zzz < nested_data.length; zzz++) {
        if (nested_data[zzz].key === getSelection(id + "_2")) {
            for (let xxx = 0; xxx < nested_data[zzz].values.length; xxx++) {
                if (nested_data[zzz].values[xxx].key === getSelection(id + "_1")) {
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
    //
    // let category = null;
    // let selection = null;
    //
    //
    // // Nest the data to select species or compartment
    // const compartmentSelection = d3.nest()
    //     .key(function (d) {
    //         return d.compartment;
    //     })
    //     .rollup(function (v) {
    //         return v.length;
    //     })
    //     .entries(data);
    //
    //
    // const speciesSelection = d3.nest()
    //     .key(function (d) {
    //         return d.species;
    //     })
    //     .rollup(function (v) {
    //         return v.length;
    //     })
    //     .entries(data);


//for loop to create choiceboxes

    for (let i = 1; i< 3; i++) {

        if (i === 1){
            category = "Compartment"
        } else if (i === 2){
            category = "Species"
        }

        if (i === 1) {
            selection = compartmentSelection;
        } else  if (i === 2) {
            selection = speciesSelection;
        }

        d3.select(".container.Boxes")
            .append("div")
            .attr("class", "selection" + id + "_" + i)
            .style("position", "relative")
            .style("float", "left")
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


        let ulHelp =
            d3.select("#Tablediv" + id + "_" + i)
                .append("ul")
                .attr("id", "TableMenu" + id + "_" + i)
                .attr("class", "dropdown-menu");



        for (let j = 0; j < selection.length; j++) {
            ulHelp
                .append("li")
                .append("a")
                .attr("href", "#")
                .text(selection[j].key).on("click", function () {
                onChange()
            });
        }


        getTextFromBoxes("#TableMenu" + id + "_" + i, "#btn-d" + id + "_" + i);
    }


}

/**
 *
 *return string of selected list item
 *
 *@param tabMenu id (#) of TableMenu
 *@param ButtonName id (#) of the button which should read out
 *@returns selTex the selection as string
 *
 */
function getTextFromBoxes(tabMenu, ButtonName) {


    $(tabMenu + " a").click(function (e) {
        e.preventDefault();
        let selText = $(this).text();
        $(ButtonName).text(selText);
        console.log(selText);

        return selText;


    })

}


/**
 *
 * change titles of the graphs
 *
 */
function title() {

    let svg = d3.select("body").transition();

    svg
        .select("#titleOne")
        .styles({fill: $(".btn-outline-1_1").css("color")})
        .text(getSelection("1_1") + ":" + getSelection("1_2"));

    svg
        .select("#titleTwo")
        .styles({fill: $(".btn-outline-2_1").css("color")})
        .text(getSelection("2_1") + ":" + getSelection("2_2"));


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
 * @param svg svg element to edit it
 */
function responsivefy(svg) {
    // get container + svg aspect ratio
    let container = d3.select(svg.node().parentNode),
        width = parseInt(svg.style("width")),
        height = parseInt(svg.style("height")),
        aspect = width / height;

    // add viewBox and preserveAspectRatio properties,
    // and call resize so that svg resizes on inital page load
    svg.attr("viewBox", "0 0 " + width + " " + height)
        .attr("preserveAspectRatio", "xMinYMid")
        .call(resize);

    // to register multiple listeners for same event type,
    // you need to add namespace, i.e., 'click.foo'
    // necessary if you call invoke this function for multiple svgs
    // api docs: https://github.com/mbostock/d3/wiki/Selections#on
    d3.select(window).on("resize." + container.attr("id"), resize);

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
            return d.species === getSelection(id + "_2") && d.compartment === getSelection(id + "_1")
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
            return d.species === getSelection(id + "_2") && d.compartment === getSelection(id + "_1")
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

