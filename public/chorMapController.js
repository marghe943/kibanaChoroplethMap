/*  A KIBANA PLUGIN FOR CHOROPLETH MAPS
    Copyright (C) 2017  Margherita Gambini

    This file is part of choropleth_map.

    choropleth_map is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    choropleth_map is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with choropleth_map.  If not, see <http://www.gnu.org/licenses/>.

/////////////////////////////////////////////////////////////////////////////////////

*/

import '../node_modules/leaflet/dist/leaflet.css';
import '../node_modules/leaflet/dist/leaflet.js';
import '../node_modules/angular/angular.min.js';
import '../node_modules/elasticsearch-browser/elasticsearch.angular.min.js';
import '../node_modules/angular-leaflet-directive/dist/angular-leaflet-directive.js';
import '../node_modules/jquery/dist/jquery.min.js';
import FilterBarQueryFilterProvider from 'ui/filter_bar/query_filter';
import '../conf.js';

define(function(require){

	var module = require('ui/modules').get('kibana/choroplet_map', ['kibana','leaflet-directive','elasticsearch']);

	module.service('client', function (esFactory) {
      return esFactory({
        host: 'http://'+window.host+':'+window.port,
        requestTimeout:50000,
        log:'trace'
      });
    });

	module.controller('ChorMapController',function($scope,$rootScope,$route,$http,Private,client,esFactory,leafletMapEvents,leafletData){

        //INITIALIZATIONS

        var checkFields = Private(require('plugins/choropleth_map/utils/checkGeoFields'));
        var events = Private(require('plugins/choropleth_map/utils/events'));
        var query = Private(require('plugins/choropleth_map/utils/geoQuery'));
        var Map = Private(require('plugins/choropleth_map/utils/map'));
        const queryFilter = Private(FilterBarQueryFilterProvider);
        var initialization = true;
        var needFilters = false;
        var needQueryString = false;
        var filter_query_string = {};
        var filters_bar = [];
        var filters_tot = [];
        var JSON_filters_tot = '';
        var inputQueryString = document.getElementsByClassName("kuiLocalSearchInput"); //the html element in which you can type a filter.
        
        //GET FILES JSON OF BORDERS
        var Data_layers = {
            "countries":require('./utils/jsons/countries.json'),
            "regions":require('./utils/jsons/regions.json'),
            "italy_provinces":require('./utils/jsons/italy_provinces.json'),
            "italy_municipalities":require('./utils/jsons/italy_municipalities.json')
        };

        $scope.mapID = $scope.$parent.vis.title;

        $scope.mapIDLayer = {
            "countries":$scope.mapID+"_countries",
            "regions":$scope.mapID+"_regions",
            "italy_provinces":$scope.mapID+"_italy_provinces",
            "italy_municipalities":$scope.mapID+"_italy_municipalities"
        }

        $scope.oldValuesOptions = {};
        $scope.where_are_we = $scope.$parent.vis._editableVis != undefined ? 'visualization':'dashboard';
        $scope.doneQuery = true; //to visualize the map at the beginning

        $scope.colorLegend = {
            "norm":{
                "linear":['#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081'],
                "logarithmic":['white','#f7fcf0','#e0f3db','#ccebc5','#a8ddb5','#7bccc4','#4eb3d3','#2b8cbe','#0868ac','#084081'],
                "customizable":[]
            },
            "notNorm":{
                "linear":['#FFFFCC','#FFEDA0','#FED976','#FEB24C','#FD8D3C','#FC4E2A','#E31A1C','#BD0026','#800026'],
                "logarithmic":['white','#FFFFCC','#FFEDA0','#FED976','#FEB24C','#FD8D3C','#FC4E2A','#E31A1C','#BD0026','#800026'],
                "customizable":[]
            }
        };

        $scope.intervalsLegend = {
            "norm":{
                "countries":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                },
                "regions":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                },
                "italy_provinces":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                },
                "italy_municipalities":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                }
            },
            "notNorm":{
                "countries":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                },
                "regions":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                },
                "italy_provinces":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                },
                "italy_municipalities":{
                    "linear":[],
                    "logarithmic":[],
                    "customizable":[]
                }
            }
        };


        $scope.errorField = false;

        $scope.combinationAlreadVisualized = {
            "countries":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' ',
                "how_show_data":' ',
                "normalized":' '
            },
            "regions":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' ',
                "how_show_data":' ',
                "normalized":' '
            },
            "italy_provinces":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' ',
                "how_show_data":' ',
                "normalized":' '
            },
            "italy_municipalities":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' ',
                "how_show_data":' ',
                "normalized":' '
            }
        };

        //CATCH EVENTS
        for(var key in $scope.mapIDLayer){
            $scope.$on("leafletDirectiveGeoJson."+$scope.mapIDLayer[key]+".mouseover", function(ev, leafletPayload) {
                    console.log("MOUSEOVER");
                    events.MouseOverEvent($scope,leafletPayload.leafletObject.feature, leafletPayload.leafletEvent);
                });
            
            $scope.$on("leafletDirectiveGeoJson."+$scope.mapIDLayer[key]+".mouseout", function(ev, leafletPayload) {
                    events.MouseOutEvent($scope, leafletPayload);
                });

            $scope.$on("leafletDirectiveGeoJson."+$scope.mapIDLayer[key]+".click", function(ev, leafletPayload) {
                   events.ClickEvent($scope, leafletPayload, query, client,queryFilter);
                });

        }

        //for filters from the filter_bar
        $scope.$listen(queryFilter, 'update', function (){
            var queryFilters = queryFilter.getFilters();
            filters_bar = []; //clear filter_bar
            filters_tot = []; //clear filter_tot
            for (var key in queryFilters)
                filters_bar.push(queryFilters[key]);
            
            for(var key in filters_bar)
                filters_tot.push(filters_bar[key]);

            if(JSON.stringify(filter_query_string) != "{}") //not empty
                filters_tot.push(filter_query_string);

            console.log("FILTERS_TOT, QUERYFILTERS");
            console.log(filters_tot);

            needFilters = (filters_tot.length != 0)? true:false;
            $scope.errorField = false;
            $scope.doneQuery = false;
            query.makeQuery(client,$scope,Data_layers[$scope.layerChosen],leafletData,needFilters,filters_tot);

            $scope.combinationAlreadVisualized[$scope.layerChosen]['filters'] = JSON.stringify(filters_tot);
            $scope.oldValuesOptions[4] = JSON.stringify(filters_tot);
       
         });

        //for query_string filter
        $(inputQueryString).on('keyup', function(e) {

            if(e.which == 13){

                filter_query_string = {};
                filters_tot = [];

                if($route.current.scope.model != undefined)
                    filter_query_string = $route.current.scope.model.query;
                else
                    filter_query_string = $route.current.scope.state.query;
                
                console.log("filters_bar keyup");
                console.log(filters_bar);

                for(var key in filters_bar)
                    filters_tot.push(filters_bar[key]);

                filters_tot.push(filter_query_string);

                console.log("KEYUP, FILTERS_TOT");
                console.log(filters_tot);

                needFilters = (filters_tot.length != 0)? true:false;
                $scope.errorField = false;
                $scope.doneQuery = false;
                query.makeQuery(client,$scope,Data_layers[$scope.layerChosen],leafletData,needFilters,filters_tot);

                $scope.combinationAlreadVisualized[$scope.layerChosen]['filters'] = JSON.stringify(filters_tot);
                $scope.oldValuesOptions[4] = JSON.stringify(filters_tot);
            }
        });

        var borders = {
            northEast: {
                lat: 90,
                lng: 180
            },
            southWest: {
                lat: -90,
                lng: -180
            }
        };

        if($scope.where_are_we == 'visualization'){
		 angular.extend($scope, {
                center: {
                    lat: 40.8471,
                    lng: 14.0625,
                    zoom: 2
                },
                maxbounds: borders,
                defaults:{
                    tileLayer: 'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
                    maxZoom: 10,
                    minZoom: 1
                },
                geojson_countries:{
                    data:Data_layers["countries"],
                    style:{
                        fillColor:"transparent",
                        color:"transparent",
                        weight:1
                    }
                },
                geojson_regions:{
                    data:Data_layers["regions"],
                    style:{
                        fillColor:"transparent",
                        color:"transparent",
                        weight:1
                    }
                },
                geojson_italy_provinces:{
                    data:Data_layers["italy_provinces"],
                    style:{
                        fillColor:"transparent",
                        color:"transparent",
                        weight:1
                    }
                },
                geojson_italy_municipalities:{
                    data:Data_layers["italy_municipalities"],
                    style:{
                        fillColor:"transparent",
                        color:"transparent",
                        weight:1
                    }
                },
                legend_countries:{},
                legend_regions:{},
                legend_italy_provinces:{},
                legend_italy_municipalities:{}
            });

        }else{ //we're in a dashboard, so we can only load the layer that we've chosen in the saved Visualization.

            angular.extend($scope, {
                center: {
                    lat: 40.8471,
                    lng: 14.0625,
                    zoom: 2
                },
                maxbounds: borders,
                defaults:{
                    tileLayer: 'https://api.tiles.mapbox.com/v4/mapbox.light/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw',
                    maxZoom: 10,
                    minZoom: 1
                },
                geojson_countries:{},
                geojson_regions:{},
                geojson_italy_provinces:{},
                geojson_italy_municipalities:{},
                legend_countries:{},
                legend_regions:{},
                legend_italy_provinces:{},
                legend_italy_municipalities:{}
            });

            $scope["geojson_"+$scope.vis.params.layer]["data"] = Data_layers[$scope.vis.params.layer];
            $scope["geojson_"+$scope.vis.params.layer]["style"] = {
                                                                        fillColor:"transparent",
                                                                        color:"transparent",
                                                                        weight:1
                                                                    };

        }

        //If you're in a dashboard you could want to resize the panel and if you do it the leaflet map will resize.

        if($scope.where_are_we == 'dashboard'){
            var resizeDashboardMapInterval = setInterval(resizeDashboardMap,500);

            function resizeDashboardMap(){
                if(document.getElementById($scope.mapIDLayer[$scope.vis.params.layer]+"Resize") != null){

                    //code from http://manos.malihu.gr/event-based-jquery-element-resize/
                    Array.prototype.forEach.call(document.querySelectorAll("#"+$scope.mapIDLayer[$scope.vis.params.layer]+"Resize"+" iframe"),function(el){
                        (el.contentWindow || el).onresize=function(){

                          leafletData.getMap($scope.mapIDLayer[$scope.vis.params.layer]).then(function(map) {
                                map.invalidateSize();
                                map._resetView(map.getCenter(), map.getZoom(), true);   
                            });

                        }
                      });
                    console.log("Clear interval");
                    window.clearInterval(resizeDashboardMapInterval);
                }
            };
        }

        //TO ADJUST THE SIZE OF THE 4 MAPS (one for each layer)
        var adjustMapSizeInterval = setInterval(adjustMapSize,500);

        function adjustMapSize(){
            var next = 0;
            for(var key in $scope.mapIDLayer){
                if(document.getElementById($scope.mapIDLayer[key]) != null){
                    leafletData.getMap($scope.mapIDLayer[key]).then(function(map) {
                            map.invalidateSize();
                            map._resetView(map.getCenter(), map.getZoom(), true);   
                        });
                    next++;
                }

            }
            //if $scope.where_are_we == 'visualization', then we have 4 maps (countries,regions,italy_provinces,italy_municipalities)
            //if $scope.where_are_we == 'dashboard', then we only have 1 map (the one corresponding to the vis.params.layer variable)
            if(($scope.where_are_we == 'visualization' && next == 4) || ($scope.where_are_we == 'dashboard' && next == 1))
                window.clearInterval(adjustMapSizeInterval);
        };
       
        //WATCH INDEX PATTERN CHANGING

        $scope.$watch('vis.indexPattern.id',function(id){
            $scope.vis.type.params.geoShapeFields = [];
            $scope.vis.type.params.geoPointFields = [];
            $scope.vis.params.geoShapeField = '';
            $scope.vis.params.geoPointField = '';
            $scope.oldValuesOptions[0] = ''; //layer
            $scope.oldValuesOptions[1] = ''; //geo_shape_field
            $scope.oldValuesOptions[2] = ''; //geo_point_field
            $scope.oldValuesOptions[3] = ''; //index_chosen
            $scope.oldValuesOptions[4] = ''; //JSON filters
       
            $scope.intervalsLegend = {
                "norm":{
                    "countries":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    },
                    "regions":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    },
                    "italy_provinces":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    },
                    "italy_municipalities":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    }
                },
                "notNorm":{
                    "countries":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    },
                    "regions":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    },
                    "italy_provinces":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    },
                    "italy_municipalities":{
                        "linear":[],
                        "logarithmic":[],
                        "customizable":[]
                    }
                }
            };

            var needFilters = false;
            var needQueryString = false;
            var filter_query_string = {};
            var filters_bar = [];
            var filters_tot = [];
            var JSON_filters_tot = '';

            //check geo_shape and geo_point fields
            checkFields.checkGeoFields($scope);
            checkFields.getAvailableIndices($scope,client);
            $scope.map = new Map();

        });

        if($scope.where_are_we == 'dashboard'){ //you're in a dashboard
            //search geopoint and geoshape fields in .kibana index.
            //For some unknown reasons Kibana doesn't save the geopoint and geoshape fields inside $scope.vis.params.geoShapeField and $scope.vis.params.geoPointField
            query.queryKibanaIndex($scope,client); 
        }    

        //FIND FILTERS TO APPLY. In a dashboard $route.current.scope.model is defined instead of $route.current.scope.state

        var filtersBar = ($scope.where_are_we == 'visualization')? $route.current.scope.state.filters:queryFilter.getFilters();
        filter_query_string = ($scope.where_are_we == 'visualization')?$route.current.scope.state.query:$route.current.scope.model.query;

        for(var key in filtersBar){
            filters_bar.push(filtersBar[key]);
            filters_tot.push(filtersBar[key]);
        }

        if(JSON.stringify(filter_query_string) != "{}") //not empty
            filters_tot.push(filter_query_string);
        
        needFilters = (filters_tot.length != 0)? true:false;

        
        //WATCH OPTION FIELDS

        if(!$scope.errorField){

            $scope.$watchGroup(['vis.params.layer','vis.params.geoShapeField','vis.params.geoPointField','vis.params.normalized','vis.params.how_show_data','vis.params.index_chosen','vis.params.ranges'],function(newValues,oldValues){

                $scope.layerChosen = newValues[0];
                $scope.how_show_data = newValues[4];
                JSON_filters_tot = JSON.stringify(filters_tot);

                var norm = ($scope.vis.params.normalized == "yes")?"norm":"notNorm";
                needFilters = (filters_tot.length != 0)? true:false;  

                //for debugging
                console.log("JSON stringify: "+JSON_filters_tot);
                console.log("oldValues: " + $scope.oldValuesOptions[0] + ' ,' + $scope.oldValuesOptions[1] + ' ,' + $scope.oldValuesOptions[2] + ' ,' + $scope.oldValuesOptions[3] + ' ,' + $scope.oldValuesOptions[4]);
                console.log("newValues: " + newValues[0] + ' ,' + newValues[1] + ' ,' + newValues[2] + ' ,' + newValues[3] + ' ,' + newValues[4] + ' ,' + newValues[5]);

                if((newValues[1] != '') && (newValues[2] != '') && (newValues[5] != '')){
                    $scope.errorField = false;
                    $scope.doneQuery = false;

                    if($scope.how_show_data == "customizable"){

                        if($scope.vis.params.ranges.length == 0){
                            $scope.errorField = true;
                            $scope.textError = "YOU HAVE TO CHOOSE AT LEAST ONE RANGE.";
                            return;
                        }

                        var intervals = [];
                        $scope.colorLegend[norm][$scope.how_show_data] = [];
                        $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data] = [];

                        $scope.colorLegend[norm][$scope.how_show_data].push("white");
                        $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data].push("data out of the intervals chosen");

                        for(var key in $scope.vis.params.ranges){
                            $scope.colorLegend[norm][$scope.how_show_data].push($scope.vis.params.ranges[key].color);

                            if(($scope.vis.params.ranges[key].from == undefined) || ($scope.vis.params.ranges[key].to == undefined) || ($scope.vis.params.ranges[key].from >= $scope.vis.params.ranges[key].to)){
                                $scope.errorField = true;
                                $scope.textError = "1) YOU HAVE TO DEFINE ALL RANGES YOU'VE CREATED.\n"+
                                                "2) \"From\" NEEDS TO BE LESS THAN \"To\"";
                                return;
                            }

                            $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data].push('[' + $scope.vis.params.ranges[key].from + ' - ' + $scope.vis.params.ranges[key].to + ')');
                            intervals.push($scope.vis.params.ranges[key].from);
                            intervals.push($scope.vis.params.ranges[key].to);
                        }

                        $scope.map.setIntervals($scope.layerChosen,norm,'customizable',intervals);

                    }
                   
                   if ((newValues[0] == $scope.oldValuesOptions[0]) && (newValues[1] == $scope.oldValuesOptions[1]) && (newValues[2] == $scope.oldValuesOptions[2]) && (newValues[5] == $scope.oldValuesOptions[3]) && (JSON_filters_tot == $scope.oldValuesOptions[4])){ //
                       
                        console.log("change style");
                        
                        $scope.doneQuery = true;
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['how_show_data'] = newValues[4];
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['normalized'] = newValues[3];

                        $scope["legend_"+$scope.layerChosen] = {
                                                                    colors: $scope.colorLegend[norm][$scope.how_show_data],
                                                                    labels: $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data]
                                                                };
                        events.changeStyle($scope,leafletData);

                    }else{
                        
                        if(($scope.combinationAlreadVisualized[$scope.layerChosen]['geo_shape_field'] == newValues[1]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['geo_point_field'] == newValues[2]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['index_chosen'] == newValues[5]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['filters'] == JSON_filters_tot) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['how_show_data'] == newValues[4]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['normalized'] == newValues[3])){ //only layer has changed
                            
                            console.log("data are available for the combination chosen");
                            
                            $scope.doneQuery = true;
                            $scope["legend_"+$scope.layerChosen] = {
                                                                    colors: $scope.colorLegend[norm][$scope.how_show_data],
                                                                    labels: $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data]
                                                                };

                            setTimeout(function(){
                                leafletData.getMap($scope.mapIDLayer[newValues[0]]).then(function(map) {
                                    console.log("RESIZE");
                                    map.invalidateSize();
                                    map._resetView(map.getCenter(), map.getZoom(), true);   
                                });
                            },200);
        
                            
                        }
                        else{
                            console.log("data are NOT available for the combination chosen");
                            query.makeQuery(client,$scope,Data_layers[$scope.layerChosen],leafletData,needFilters,filters_tot);
                        }

                        $scope.oldValuesOptions[0] = newValues[0];
                        $scope.oldValuesOptions[1] = newValues[1];
                        $scope.oldValuesOptions[2] = newValues[2];
                        $scope.oldValuesOptions[3] = newValues[5];
                        $scope.oldValuesOptions[4] = JSON_filters_tot;
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['geo_shape_field'] = newValues[1];
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['geo_point_field'] = newValues[2];
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['index_chosen'] = newValues[5];
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['filters'] = JSON_filters_tot;
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['how_show_data'] = newValues[4];
                        $scope.combinationAlreadVisualized[$scope.layerChosen]['normalized'] = newValues[3];

                    }
                }
                else if(!initialization){
                        $scope.errorField = true;
                        $scope.textError = "YOU HAVE TO CHOOSE THE INDEX WHICH WILL BE USED FOR THE GEO_SHAPE QUERY, A GEO_SHAPE FIELD AND A GEO_POINT FIELD.";
                    }else{
                        initialization = false;
                    }

                /*if checkFields.checkGeoFields($scope) and/or checkFields.getAvailableIndices($scope,client) fail during the inizializazion phase then you can't go on,
                otherwise you enter in the phase in which you can start to use the plugin.*/
                
            });
        }
    
	
	});
});
