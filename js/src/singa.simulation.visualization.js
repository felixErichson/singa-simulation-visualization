//Global variables

const color = ['#d95f02', '#0570b0', '#d7301f', '#88763e'];

let componentCombinations = [],
    reducedNodeData = [],
    activeComponentIdices = [],
    /**
     * contains all timeSteps steps
     * @type {Array}
     */
    timeSteps = [],
    selectedNode,
    compartmentsOfSelectedNode = [],
    /**
     * contains all identifiers of all compartments once
     * @type {Array}
     */
    compartmentIdentifiers = [],

    /**
     * contains all identifiers of all species once
     * @type {Array}
     */
    speciesIdentifiers = [],

    /**
     * contains all identifiers of all nodes once
     * @type {Array}
     */
    nodeIdentifiers = [],
    timeUnit = null,
    concentrationUnit = null,
    reader = new FileReader(),
    globalData = null,

    /**
     * a nested map containing the vesicle states grouped by timeSteps step
     *
     * key: timeSteps step -> value:
     *      ( key: vesicle -> value: state)
     */
    vesicleStates = d3.map(),
    vesiclePaths = d3.map(),

    heatmapSvg,
    searchButtonDataArray = [],
    heatmapData = d3.map(),
    heatmapXRange = [],
    heatmapYRange = [],
    playButton,
    heatmapColor,
    nestedData,
    simulationWidth,
    simulationHeight;

let regEx = new RegExp("\\((\\d+),(\\d+)\\)", "g");

//Functions to read and structure the data into a uniform data format (nestedData)

$('#optionModal').draggable();

/**
 *
 * @param identifier component consisting of compartment_species (cytoplasm_CAMP)
 * @return compartment as string (cytoplasm)
 */
function getCompartmentFromStringIdentifier(identifier) {
    return identifier.substr(0, identifier.indexOf("_"));
}

/**
 *
 * @param identifier component consisting of compartment_species (cytoplasm_CAMP)
 * @return species as string (CAMP)
 */
function getSpeciesFromStringIdentifier(identifier) {
    return identifier.substr(identifier.indexOf("_") + 1);
}

/**
 * searches the index number of array speciesIdentifiers with second number of indexIdentifier
 * @param indexIdentifier component consisting of two numbers separated by "_" (1_2)
 * @return species as string
 */
function getSpeciesFromIndexIdentifier(indexIdentifier) {
    if (indexIdentifier.split("_")[0] === "search") {
        return indexIdentifier.split("_")[1]
    } else {
        return speciesIdentifiers[parseInt(indexIdentifier.split("_")[1])]
    }
}

/**
 * searches the index number of array compartmentIdentifiers with first number of indexIdentifier
 * @param indexIdentifier component consisting of two numbers separated by "_" (1_2)
 * @return compartment as string
 */
function getCompartmentFromIndexIdentifier(indexIdentifier) {
    if (indexIdentifier.split("_")[0] === "search") {
        return "search"
    } else {
        return compartmentsOfSelectedNode[parseInt(indexIdentifier.split("_")[0])]
    }
}

/**
 * searches the index numbers of consigning compartment and species and joins to am index identifier seperatet by an "_"
 * @param selectedCompartment
 * @param selectedSpecies
 * @return index identifier (2_1)
 */
function getIndexIdentifier(selectedCompartment, selectedSpecies) {
    return compartmentsOfSelectedNode.indexOf(selectedCompartment) + "_" + speciesIdentifiers.indexOf(selectedSpecies)
}

/**
 * searches in componentCombinations of species and return substring ob component
 * @param species
 * @return compartment as string
 */
function getCompartmentFromSpecies(species) {
    let compartment = [];
    componentCombinations.forEach(function (currentTrajectory) {
        if (currentTrajectory.split("_")[1] === species) {
            compartment.push(currentTrajectory.split("_")[0]);
        }
    });
    return compartment;
}

$(document).ready(function () {
    $('input:checkbox').click(function () {
        $('input:checkbox').not(this).prop('checked', false);
    });
});


function resetGlobalArrays() {
    componentCombinations.length = 0;
    reducedNodeData.length = 0;
    activeComponentIdices.length = 0;
    timeSteps.length = 0;
    compartmentsOfSelectedNode.length = 0;
    speciesIdentifiers.length = 0;
    compartmentIdentifiers.length = 0;
    nodeIdentifiers.length = 0;
    // heatmapData.length = 0;
    heatmapXRange.length = 0;
    heatmapYRange.length = 0;

}

function btnAllTrajectoriesVisible() {
    $(".input-group.mb-3").removeClass("invisible");
    $(".input-group.mb-3").toggleClass("visible");
}

function clearHtmlTags() {
    d3.select("#menu-all-trajectories").html("");
    d3.select("#menu-all-trajectories").selectAll("*").remove();
    d3.select("#trajectory-view-graph").html("");
    d3.select("#menu-species-selection-species-buttons").html("");
    d3.select('#menu-custom-search-component-list').html("");
    d3.select("#menu-custom-search-creation-area").html("");
    d3.select("#menu-species-selection-search-buttons").html("");
    $("#menu-species-selection-search-buttons").hide();
}

function initializeMainContent() {
    searchButtonDataArray.length = 0;
    createSpeciesSelectionMenu();
    initializePlotSvg();
    createAllTrajectoriesMenu();
    createCustomSearchMenu();
}

/**
 * creates an array of
 * @param compartment
 * @param spec
 * @return {Array}
 */
function filterData(compartment, spec) {

    let trajectoryData = [];
    let obj = {};

    nestedData.keys().forEach(function (element) {

        if (nestedData.get(element).get(selectedNode) === undefined) {
            obj = {
                x: parseFloat(element),
                y: undefined
            };
            trajectoryData.push(obj);

        } else if (nestedData.get(element).get(selectedNode).get(compartment).get(spec) === undefined) {
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


function showOptions() {
    $('#optionModal').css('visibility', 'visible');
    // $("#optionModal").show();

}

function hideOptions() {
    $('#optionModal').css('visibility', 'hidden');
    // $("#optionModal").hide();

}


function showFigureMenu() {
    $('#figure-modal').css('visibility', 'visible');
    // $("#optionModal").show();

}

function hideFigureMenu() {
    $('#figure-modal').css('visibility', 'hidden');
    // $("#optionModal").hide();

}

/**
 * genarates tooltip on mouseouver events at mouse position
 * @param text content of tooltip (html text possible)
 */
function generateTooltip(text) {
    infoTooltip.html(text)
        .style("left", (d3.event.pageX + 20) + "px")
        .style("top", (d3.event.pageY - 28) + "px");
}

function showTooltip() {
    infoTooltip.transition()
        .duration(500)
        .style("z-index", 100)
        .style("opacity", .9);
}

function hideTooltip() {
    infoTooltip.transition()
        .duration(500)
        .style("opacity", 0);
}

function setInterpolator() {

    if ($('input[name="colorcheme"]:checked').val() === "Viridis") {
        interpolator = d3.interpolateViridis;
        updateSpatialView();
    } else if ($('input[name="colorcheme"]:checked').val() === "Inferno") {
        interpolator = d3.interpolateInferno;
        updateSpatialView();
    } else if ($('input[name="colorcheme"]:checked').val() === "Magma") {
        interpolator = d3.interpolateMagma;
        updateSpatialView();
    }

}

d3.select("#home-tab")
    .on("mouseover", function () {
        generateTooltip(" All species are represented as " +
            "<br> buttons to their assigned compartment. " +
            "<br> Click the buttons to show " +
            "<br>concentration change as line plot");
        showTooltip()
    })
    .on("mouseleave", function () {
        hideTooltip()
    });

d3.select("#profile-tab")
    .on("mouseover", function () {
        generateTooltip(" Search patterns and summ data. <br>" +
            "Button is created in species selection.");
        showTooltip()
    })
    .on("mouseleave", function () {
        hideTooltip()
    });


d3.select("#contact-tab")
    .on("mouseover", function () {
        generateTooltip("Get an overview of all trajectories in a node.");
        showTooltip()
    })
    .on("mouseleave", function () {
        hideTooltip()
    });

d3.select("#relative_scale_info")
    .on("mouseover", function () {
        generateTooltip("scaled to the maximum value of a timeSteps step");
        showTooltip()
    })
    .on("mouseleave", function () {
        hideTooltip()
    });

d3.select("#absolute_scale_info")
    .on("mouseover", function () {
        generateTooltip("scaled to the maximum value over all timeSteps steps");
        showTooltip()
    })
    .on("mouseleave", function () {
        hideTooltip()
    });


function getModal(id) {
    console.log(document.getElementById(id));
    return document.getElementById(id);
}

function closeModal(id) {
    getModal(id).style.display = "none";
}
function handleModal(id) {

    getModal(id).style.display = "block";

    window.onclick = function (event) {
        if (event.target === getModal(id)) {
            closeModal(id);
        }
    }
}
