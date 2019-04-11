//Global variables

const color = ['#d95f02', '#7570b3', '#e7298a'];

let componentCombinations = [],
    nodeComponentCombinations = [],
    reducedNodeData = [],
    activeComponentIdices = [],
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
    heatmapSvg,
    heatmapY,
    heatmapX,
    searchButtonDataArray = [],
    heatmapData = [],
    heatmapXRange = [],
    heatmapYRange = [],
    playButton,
    heatmapColor,
    selectedTime,
    nestedData;

let regEx = new RegExp("\\((\\d+),(\\d+)\\)", "g");

//Functions to read and structure the data into a uniform data format (nestedData)

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
 * searches the index number of array allSpecies with second number of indexIdentifier
 * @param indexIdentifier component consisting of two numbers separated by "_" (1_2)
 * @return species as string
 */
function getSpeciesFromIndexIdentifier(indexIdentifier) {
    if (indexIdentifier.split("_")[0] === "search") {
        return indexIdentifier.split("_")[1]
    } else {
        return allSpecies[parseInt(indexIdentifier.split("_")[1])]
    }
}

/**
 * searches the index number of array allCompartments with first number of indexIdentifier
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
    return compartmentsOfSelectedNode.indexOf(selectedCompartment) + "_" + allSpecies.indexOf(selectedSpecies)
}

/**
 * searches in componentCombinations of species and return substring ob component
 * @param species
 * @return compartment as string
 */
function getCompartmentFromSpecies(species) {
    let compartment = "";
    componentCombinations.forEach(function (currentTrajectory) {
        if (currentTrajectory.split("_")[1] === species) {
            compartment = currentTrajectory.split("_")[0];
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


function getRandomColor() {
    let letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}