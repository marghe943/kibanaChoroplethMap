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
        $scope.oldValuesOptions = {};

        //you can avoid to execute queries if you've already done them with this layer and with a particular combination of geo_shape, geo_point fields and filters (see $scope.combinationAlreadVisualized)
        var layerAlreadyVisualized = {
            "countries":false,
            "regions":false,
            "italy_provinces":false,
            "italy_municipalities":false
        };

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
                "filters":' '
            },
            "regions":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' '
            },
            "italy_provinces":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' '
            },
            "italy_municipalities":{
                "index_chosen":' ',
                "geo_shape_field":' ',
                "geo_point_field":' ',
                "filters":' '
            }
        };

        //CATCH EVENTS

        $scope.$on("leafletDirectiveGeoJson."+$scope.mapID+".mouseover", function(ev, leafletPayload) {
                events.MouseOverEvent($scope,leafletPayload.leafletObject.feature, leafletPayload.leafletEvent);
            });
        
        $scope.$on("leafletDirectiveGeoJson."+$scope.mapID+".mouseout", function(ev, leafletPayload) {
                events.MouseOutEvent($scope, leafletPayload);
            });

        $scope.$on("leafletDirectiveGeoJson."+$scope.mapID+".click", function(ev, leafletPayload) {
               events.ClickEvent($scope, leafletPayload, query, client,queryFilter);
            });

        $scope.$on("leafletDirectiveMap."+$scope.mapID+".layeradd", function(ev, leafletPayload) {
                if(layerAlreadyVisualized[$scope.layerChosen]){
                    events.AddLayerEvent($scope, leafletPayload);
                }
            });

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
            query.makeQuery(client,$scope,Data_layers[$scope.layerChosen],leafletData,needFilters,filters_tot);
       
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
                query.makeQuery(client,$scope,Data_layers[$scope.layerChosen],leafletData,needFilters,filters_tot);
            }
        });

        //if you're in a dashboard you could want to resize the panel and if you do it the leaflet map will resize.

        //code from http://manos.malihu.gr/event-based-jquery-element-resize/
        if($scope.$parent.vis._editableVis == undefined){ //you're in a dashboard
            setTimeout(function(){ //we need this setTimeout because vis.html (containing <div id="{{mapID}}Resize" class = "resize"> ... </div>)
                                    //is not loaded yet.
               
                Array.prototype.forEach.call(document.querySelectorAll("#"+$scope.mapID+"Resize"+" iframe"),function(el){
                    (el.contentWindow || el).onresize=function(){

                      leafletData.getMap($scope.mapID).then(function(map) {
                            map.invalidateSize();
                            map._resetView(map.getCenter(), map.getZoom(), true);   
                        });

                    }
                  });

            },200);
        }

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
                }
            });

        //TO ADJUST THE SIZE OF THE MAP
        leafletData.getMap($scope.mapID).then(function(map) {
                setTimeout(function() {
                    map.invalidateSize();
                    map._resetView(map.getCenter(), map.getZoom(), true);   
                }, 200);
            });


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
            layerAlreadyVisualized = {
                "countries":false,
                "regions":false,
                "italy_provinces":false,
                "italy_municipalities":false
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

        if($scope.$parent.vis._editableVis == undefined){ //you're in a dashboard
            //search geopoint and geoshape fields in .kibana index.
            //For some reasons Kibana doesn't save the geopoint and geoshape fields inside $scope.vis.params.geoShapeField and $scope.vis.params.geoPointField
            query.queryKibanaIndex($scope,client); 
        }    

        //FIND FILTERS TO APPLY. $route.current.scope.state == undefined means that we are in a dashboard, where $route.current.scope.model is defined instead.

        var filtersBar = ($route.current.scope.state != undefined)? $route.current.scope.state.filters:queryFilter.getFilters();
        filter_query_string = ($route.current.scope.state != undefined)?$route.current.scope.state.query:$route.current.scope.model.query;

        for(var key in filtersBar){
            filters_bar.push(filtersBar[key]);
            filters_tot.push(filtersBar[key]);
        }

        if(JSON.stringify(filter_query_string) != "{}") //not empty
            filters_tot.push(filter_query_string);
        
        needFilters = (filters_tot.length != 0)? true:false;

        //console.log($route.current.scope);
        
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
                console.log("FILTERS_TOT_WATCH");
                console.log(filters_tot);
                console.log("oldValues ...: "+oldValues[0] + ","+oldValues[1] + ","+oldValues[2] + ","+oldValues[3] + ","+oldValues[4] + ","+oldValues[5] + ","+oldValues[6]);
                console.log("oldValues: " + $scope.oldValuesOptions[0] + ' ,' + $scope.oldValuesOptions[1] + ' ,' + $scope.oldValuesOptions[2] + ' ,' + $scope.oldValuesOptions[3] + ' ,' + $scope.oldValuesOptions[4]);
                console.log("newValues: " + newValues[0] + ' ,' + newValues[1] + ' ,' + newValues[2] + ' ,' + newValues[3] + ' ,' + newValues[4] + ' ,' + newValues[5] + ' ,'+newValues[6]);

                if((newValues[1] != '') && (newValues[2] != '') && (newValues[5] != '')){
                    $scope.errorField = false;

                    if($scope.how_show_data == "customizable"){

                        if($scope.vis.params.ranges.length == 0){
                            $scope.errorField = true;
                            $scope.textError = "YOU HAVE TO CHOSE AT LEAST ONE RANGE.";
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

                        //for debugging
                        console.log($scope.colorLegend);
                        console.log($scope.intervalsLegend);
                        console.log($scope.map.getIntervals($scope.layerChosen,norm,'customizable'));

                    }
                    
                    if ((newValues[0] == $scope.oldValuesOptions[0]) && (newValues[1] == $scope.oldValuesOptions[1]) && (newValues[2] == $scope.oldValuesOptions[2]) && (newValues[5] == $scope.oldValuesOptions[3]) && (JSON_filters_tot == $scope.oldValuesOptions[4])){ //
                        console.log("change style");

                        angular.extend($scope,{
                            legend:{
                                    colors: $scope.colorLegend[norm][$scope.how_show_data],
                                    labels: $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data]
                            }
                        });

                        events.changeStyle($scope,leafletData);

                    }else{
                        console.log("request");

                        var data = $scope.map.getJsonData($scope.layerChosen);
                        if(data != undefined && ($scope.combinationAlreadVisualized[$scope.layerChosen]['geo_shape_field'] == newValues[1]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['geo_point_field'] == newValues[2]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['index_chosen'] == newValues[5]) && ($scope.combinationAlreadVisualized[$scope.layerChosen]['filters'] == JSON_filters_tot)){ //only layer has changed
                            console.log("data are available for " + $scope.layerChosen + "with " + newValues[1] + " and " + newValues[2]);
                            layerAlreadyVisualized[$scope.layerChosen] = true;

                            angular.extend($scope,{
                                legend:{
                                        colors: $scope.colorLegend[norm][$scope.how_show_data],
                                        labels: $scope.intervalsLegend[norm][$scope.layerChosen][$scope.how_show_data]
                                }
                            });
        
                            $scope.geojson.data = data;
                        }
                        else{
                            console.log("data are NOT available for " + $scope.layerChosen + "with " + newValues[1] + " and " + newValues[2]);
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

                    }
                }
                else if(!initialization){
                        $scope.errorField = true;
                        $scope.textError = "YOU HAVE TO CHOSE THE INDEX WHICH WILL BE USED FOR THE GEO_SHAPE QUERY, A GEO_SHAPE FIELD AND A GEO_POINT FIELD.";
                    }else{
                        initialization = false;
                    }

                /*if checkFields.checkGeoFields($scope) and/or checkFields.getAvailableIndices($scope,client) fail during the inizializazion phase then you can't go on,
                otherwise you enter in the phase in which you can start to use the plugin.*/
                
            });
        }
    
	
	});
});
