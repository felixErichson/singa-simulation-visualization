let selectedSpecies = [],
    filteredComponentsCombinations = [];

function createCustomSearchMenu() {
    let globalSearchIterator = 0,
        searchIdentifier = 0;

    const selectedComponent = 0,
        selectedContainment = 1,
        searchTermIndex = 2;

    addHeadOfSearchField();
    addListOfSpecies();
    addCompartmentSelection();


    function addHeadOfSearchField() {

        d3.select("#menu-custom-search-creation-area")
            .append("button")
            .attr("class", "btn btn-outline-secondary")
            .attr("type", "button")
            .attr("style", "margin-left : 10px !important")
            .text("add refinement")
            .on("click", function () {
                globalSearchIterator++;
                addCompartmentSelection()
            });

        d3.select("#menu-custom-search-creation-area")
            .append("button")
            .attr("class", "btn btn-outline-secondary")
            .attr("type", "button")
            .attr("style", "margin-left : 10px !important")
            .text("submit search ")
            .on("click", function () {
                $("#menu-species-selection-search-buttons").show();
                appendButtonForSelection(searchIdentifier);
                clearSearch();
                filterComponents();
                searchIdentifier++;
            })
            .on("mouseover", function () {
                generateTooltip("Submit the search and highlight species below." +
                    "<br> Sums up the found concentrations of the species." +
                    "<br> Generates a button in \"species selection\"");
                showTooltip();
            })
            .on("mouseleave", function () {
                hideTooltip();
            });

        d3.select("#menu-custom-search-creation-area")
            .append("input")
            .attr("type", "text")
            .attr("class", "form-control")
            .attr("style", "width : 300px !important ;margin-left : 10px !important ; display : -webkit-inline-box !important")
            .attr("id", "menu-custom-search-title")
            .attr("placeholder","add search name");
    }

    function addCompartmentSelection() {

        d3.select("#menu-custom-search-creation-area")
            .append("div")
            .attr("class", "search_div")
            .attr("id", "menu-custom-search-refinement-" + globalSearchIterator);

        d3.select("#menu-custom-search-refinement-" + globalSearchIterator)
            .append("div")
            .attr("class", "form-group col-md-4")
            .append("select")
            .attr("id", "menu-custom-search-refinement-component-" + globalSearchIterator)
            .attr("class", "form-control");

        appendOptionToField("#menu-custom-search-refinement-component-", "species");
        appendOptionToField("#menu-custom-search-refinement-component-", "compartment");

        d3.select("#menu-custom-search-refinement-" + globalSearchIterator)
            .append("div")
            .attr("class", "form-row nr" + globalSearchIterator)
            .append("div")
            .attr("class", "form-group col-2")
            .append("select")
            .attr("class", "form-control")
            .attr("id", "menu-custom-search-refinement-containment-" + globalSearchIterator);

        appendOptionToField("#menu-custom-search-refinement-containment-", "contains");
        appendOptionToField("#menu-custom-search-refinement-containment-", "not contains");

        d3.select(".form-row.nr" + globalSearchIterator)
            .append("div")
            .attr("class", "form-group col-md-4")
            .append("input")
            .attr("type", "text")
            .attr("class", "form-control")
            .attr("id", "menu-custom-search-refinement-term-" + globalSearchIterator)
            .attr("placeholder", "add search pattern");

        d3.select(".form-row.nr" + globalSearchIterator)
            .append("button")
            .attr("id", "menu-custom-search-remove-refinement-" + globalSearchIterator)
            .attr("class", "btn btn-outline-secondary")
            .attr("type", "button")
            .attr("style", "margin-left : 10px !important; margin-bottom : 15px !important ")
            .on("click", function () {
                let attributeText = $(this).attr("id");
                let identifier = attributeText.substr(attributeText.lastIndexOf("-") + 1);
                d3.select("#menu-custom-search-refinement-" + identifier).html("");
            })     .on("mouseover", function () {
            generateTooltip("remove refinement");
            showTooltip();
        })
            .on("mouseleave", function () {
                hideTooltip();
            })
            .append("i")
            .attr("class", "fas fa-times");
    }

    function appendOptionToField(selector, text) {
        d3.select(selector + globalSearchIterator)
            .append("option")
            .text(text);
    }

    function addListOfSpecies() {
        d3.select("#menu-custom-search-component-area")
            .append("ul")
            .attr("class", "list-group")
            .attr("id", "menu-custom-search-component-list");

        compartmentsOfSelectedNode.forEach(function (compartment) {
            d3.select("#menu-custom-search-component-list")
                .append("li")
                .attr("class", "list-group-item list-group-item-success")
                .text(compartment);


            componentCombinations.forEach(function (identifier) {
                if (getCompartmentFromStringIdentifier(identifier) === compartment) {

                    let indexIdentifier = getIndexIdentifier(getCompartmentFromStringIdentifier(identifier), getSpeciesFromStringIdentifier(identifier));
                    d3.select("#menu-custom-search-component-list")
                        .append("li")
                        .attr("class", "list-group-item")
                        .attr("id", "menu-custom-search-component-list-item-" + indexIdentifier)
                        .text(getSpeciesFromStringIdentifier(identifier))
                }

            })
        })
    }

    function generateRefinements() {

        let refinements = [];
        for (let i = 0; i < globalSearchIterator + 1; i++) {
            const componentSelector = `#menu-custom-search-refinement-component-${i} option:selected`;
            const containmentSelector = `#menu-custom-search-refinement-containment-${i} option:selected`;
            const termSelector = `#menu-custom-search-refinement-term-${i}`;
            if ($(componentSelector).text() !== "") {
                let inputComponent = $(componentSelector).text();
                let inputContaining = $(containmentSelector).text();
                let inputFilterText = $(termSelector).val();
                refinements.push([inputComponent, inputContaining, inputFilterText])
            }
        }
        return refinements;
    }

    function filterComponents() {

        let refinements = generateRefinements();

        componentCombinations.forEach(function (component) {
            filteredComponentsCombinations.push(component);
        });

        refinements.forEach(function (refinement) {
            let containment = determineContainment(refinement[selectedContainment]);
            if (refinement[selectedComponent] === "compartment") {
                filterCompartment(refinement[searchTermIndex], containment);
            }
            if (refinement[selectedComponent] === "species") {
                filterSpecies(refinement[searchTermIndex], containment);
            }
        });
        highlightSpecies(filteredComponentsCombinations);
    }

    function determineContainment(containment) {
        return containment === "contains";
    }

    function filterCompartment(searchTerm, containment) {
        filteredComponentsCombinations = filteredComponentsCombinations.filter(v => getCompartmentFromStringIdentifier(v).includes(searchTerm) === containment);
    }

    function filterSpecies(searchTerm, containment) {
        filteredComponentsCombinations = filteredComponentsCombinations.filter(v => getSpeciesFromStringIdentifier(v).includes(searchTerm) === containment);
    }

    function highlightSpecies(filteredComponents) {
        filteredComponents.forEach(function (components) {
            let species = getSpeciesFromStringIdentifier(components);
            selectedSpecies.push(species);
            $("li[id$=_" + allSpecies.indexOf(species) + "]").toggleClass("list-group-item-info");
        });
        generateLineFromSearch()
    }

    function sumSelectedData() {
        let summedConcentrationValues = [];
        nestedData.entries().forEach(function (timeStepEntry) {
            let summedConcentration = 0;
            compartmentsOfSelectedNode.forEach(function (compartment) {
                selectedSpecies.forEach(function (species) {
                    let currentConcentration = timeStepEntry.value.get(selectedNode).get(compartment).get(species);
                    if (currentConcentration !== undefined) {
                        summedConcentration += currentConcentration;
                    }
                })
            });
            summedConcentrationValues.push(summedConcentration);
        });
        return summedConcentrationValues;
    }

    function generateLineFromSearch() {
        let summedLineObject;
        let summedLineArray = [];
        let summedConcentrationValues = sumSelectedData();

        for (let timeIndex = 0; timeIndex < time.length; timeIndex++) {
            summedLineObject = {
                //TODO rename x in time and y concentration
                x: time[timeIndex],
                y: summedConcentrationValues[timeIndex]
            };
            summedLineArray.push(summedLineObject);
        }
        searchButtonDataArray.push(summedLineArray);
        reducedNodeData["search_" + searchIdentifier] = summedLineArray;
    }

    function appendButtonForSelection(searchIdentifier) {

        d3.select("#menu-species-selection-search-buttons")
            .append("button")
            .attr("id", "search_" + searchIdentifier)
            .attr("class", "btn btn-outline-secondary")
            .attr("type", "button")
            .text($("#menu-custom-search-title").val())
            .on("click", function () {
                onSpeciesButtonClick(this.id);
            });
    }

    function clearSearch() {
        filteredComponentsCombinations.length = 0;
        selectedSpecies.length = 0;
        $(".list-group-item").removeClass("list-group-item-info");
    }
}