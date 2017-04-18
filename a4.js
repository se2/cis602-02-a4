function extractJobsPct(jobData, year, occCode, number) {
    var res = jobData.filter(function(d) {
            return ((year == null || d.year == year) &&
                (occCode == null || d.occ_code == occCode));
        });
    res = res.sort(function(a, b) {
        return d3.descending(+a.jobs_1000, +b.jobs_1000);
    });
    if (number) {
        return res.slice(0, number);
    } else {
        return res;
    }
}

var barW = 500,
    barH = 300,
    barMargin = { top: 20, bottom: 120, left: 100, right: 20 },
    barX = d3.scaleBand().padding(0.1),
    barY = d3.scaleLinear(),
    barXAxis = null;

function createBars(divId, jobData, year, occCode) {
    var svg = d3.select(divId).append("svg")
        .attr("width", barW + barMargin.left + barMargin.right)
        .attr("height", barH + barMargin.top + barMargin.bottom)
        .append("g")
        .attr("class", "main")
        .attr("transform",
            "translate(" + barMargin.left + "," + barMargin.top + ")")

    var csData = extractJobsPct(jobData, year, occCode, 18);
    // console.log(csData);

    barX.range([0, barW])
        .domain(csData.map(function(d) {
            return d.area_title; }));
    barY.range([barH, 0])
        .domain([0, d3.max(extractJobsPct(jobData, null, occCode),
            function(d) {
                return +d.jobs_1000; })]);

    svg.selectAll("rect")
        .data(csData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("x", function(d) {
            return barX(d.area_title); })
        .attr("y", function(d) {
            return barY(+d.jobs_1000); })
        .attr("width", barX.bandwidth())
        .attr("height", function(d) {
            return barH - barY(+d.jobs_1000); })

    barXAxis = d3.axisBottom(barX);

    svg.append("g")
        .attr("transform", "translate(0," + barH + ")")
        .attr("class", "x axis")
        .call(barXAxis)

    var barYAxis = d3.axisLeft(barY);

    svg.append("g")
        .attr("class", "y axis")
        .call(barYAxis)

    svg.append("g")
        .attr("transform", "translate(-30," + (barH / 2) + ") rotate(-90)")
        .append("text")
        .style("text-anchor", "middle")
        .text("Jobs Per 1000")

    svg.append("text")
        .attr("x", barW / 2)
        .attr("y", barH + 115)
        .text("State")
}

function updateBars(divId, jobData, year) {
    // write code to update the bar chart created to the specified year
    // you should use two transitions, one to update the bar values
    // and the other to reorder the bars
    // Make sure to transition the axes, too!

}

function getStateRankings(jobData, occCode) {

    // TODO: compute the state rankings for the given occCode
    var stateRankings = {};
    // filter by occ_code
    var jobDataByCode = jobData.filter(function(d) {
    	return (d.occ_code == occCode);
    });

    _.each(jobDataByCode, function(d) {
    	// jobs for each state
	    jobDataByState = jobData.filter(function(s) {
	    	return (s.area_title == d.area_title);
	    });

	    jobDataByState = jobDataByState.sort(function(a, b) {
	    	return d3.descending(+a.tot_emp, +b.tot_emp);
	    });

	    var ranking = jobDataByState.map(function(x) {return x.occ_code; }).indexOf(d.occ_code);

	    stateRankings[d.area_title] = ranking;

    });

    return stateRankings;
}

function createBrushedVis(divId, usMap, jobData, year) {

    var jobData = jobData.filter(function(d) {
    	return (+d.year == year);
    });

    var width = 600,
        height = 400,
        occCode = "15-0000";

    var svg = d3.select(divId).append("svg")
        .attr("width", width)
        .attr("height", height);

    var projection = d3.geoAlbersUsa()
        .fitExtent([
            [0, 0],
            [width, height]
        ], usMap);

    var path = d3.geoPath()
        .projection(projection);

    var rankings = getStateRankings(jobData, occCode);
    var color = d3.scaleSequential(d3.interpolateViridis).domain([22, 0]);

    svg.append("g")
        .selectAll("path")
        .data(usMap.features)
        .enter().append("path")
        .attr("d", path)
        .attr("fill",
            function(d) {
                return color(rankings[d.properties.name]); })
        .attr("class", "state-boundary")
        .classed("highlight", false)

    var bWidth = 400,
        bHeight = 400,
        midX = 200;

    var allJobs = d3.nest()
        .key(function(d) {
            return d["occ_code"]; })
        .key(function(d) {
            return d["occ_title"]; })
        .rollup(function(v) {
            return v.reduce(function(s, d) {
                if (!+d.tot_emp) {
                    return s; }
                return s + +d.tot_emp;
            }, 0);
        })
        .entries(jobData)
        .sort(function(a, b) {
            return d3.descending(+a.values[0].value, +b.values[0].value); })

    var barSvg = d3.select(divId).append("svg")
        .attr("width", bWidth)
        .attr("height", bHeight)
        .style("vertical-align", "bottom")

    var y = d3.scaleBand()
    		.padding(0.1)
    		.range([0, bHeight])
    		.domain(allJobs.map(function(d) {
        		return d.values[0].key;
        	}));
    var x = d3.scaleLinear()
    		.range([0, bWidth - midX])
    		.domain([0, d3.max(allJobs, function(d) {return d.values[0].value; })]);

    var bars = barSvg.selectAll(".bar")
    	.data(allJobs)
        .enter().append("g")
        .attr("transform",
            function(d) {
                return "translate(0," + y(d.values[0].key) + ")"; })
        .attr("class", "bar");

    bars.append("rect")
        .attr("x", midX)
        .attr("y", 0)
        .attr("width", function(d) {
            return x(d.values[0].value); })
        .attr("height", y.bandwidth())
        .classed("highlight", function(d) {
            return d.key == occCode; })
        .on("mouseover", jobMouseEnter)

    bars.append("text")
        .attr("x", midX - 4)
        .attr("y", 12)
        .style("text-anchor", "end")
        .text(function(d) {
            var label = d.values[0].key.slice(0, -12);
            if (label.length > 33) {
                label = label.slice(0, 30) + "...";
            }
            return label;
        });


    function jobMouseEnter() {
        // TODO: add code here
        // Update highlighted bar
        d3.select(".bar .highlight").classed("highlight", false);
        d3.select(this).classed("highlight", true);
        // Update colormap
        var occCode = d3.select(this).datum().key;
        var rankings = getStateRankings(jobData, occCode);

        svg.selectAll("path")
            .attr("fill", function(d) {
                    return color(rankings[d.properties.name]);
            	})
    }

}

function processData(errors, usMap, jobsData) {
    // console.log("Errors", errors)
    createBars("#bars", jobsData, 2012, "15-0000");
    // var csData = extractJobsPct(jobsData, 2016, "15-0000", 18);
    // console.log(csData);
    updateBars("#bars", jobsData, 2016);

    createBrushedVis("#brushed", usMap, jobsData, 2016);
}

d3.queue()
    .defer(d3.json, "https://cdn.rawgit.com/dakoop/69d42ee809c9e7985a2ff7ac77720656/raw/6707c376cfcd68a71f59f60c3f4569277f20b7cf/us-states.json")
    .defer(d3.csv, "https://cdn.rawgit.com/dakoop/69d42ee809c9e7985a2ff7ac77720656/raw/6707c376cfcd68a71f59f60c3f4569277f20b7cf/occupations.csv")
    .await(processData);
