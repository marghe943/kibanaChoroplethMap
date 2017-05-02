/*  A KIBANA PLUGIN FOR CHOROPLETH MAPS
    Copyright (C) 2017  Margherita Gambini

   This file is part of chorMap.

    chorMap is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    chorMap is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with chorMap.  If not, see <http://www.gnu.org/licenses/>.

*/

define(function (require){

	return function UtilsFunctionsFactory(Private){

    function calculateQueryValues(scope,queryResult,jsonData,normValuesFlag){
      var features = jsonData.features;
      var result_query;
      var values_linear = {};
      var values_log = {};
      var max_lin;
      var min_lin;
      var min_log;
      var max_log;
      var firstObject = true;
      var check_log;
      var norm = (normValuesFlag == true)? "norm" : "notNorm";
      //console.log("normValuesFlag: "+normValuesFlag);

      for(var key in features){
        var pop = (features[key].properties.population != undefined)? features[key].properties.population : null;

        if(!normValuesFlag)
          pop = 1;

        if(pop != null){
                pop = (pop == 0)? 1 : pop;

                result_query = queryResult[features[key].properties.NAME] != undefined? queryResult[features[key].properties.NAME]:0;
                
                //LINEAR NORMALIZATION
                values_linear[features[key].properties.NAME] = (result_query / pop);

                //LOGARITHMIC NORMALIZATION
                values_log[features[key].properties.NAME] = Math.log10(result_query / pop);
                //logaritmo in base 10 dei dati sulla popolazione

                if(firstObject){

                  max_lin = min_lin = (result_query / pop);
                  
                  check_log = Math.log10((result_query)/pop);
                  
                  if(check_log == "-Infinity")
                    max_log = min_log = '';
                  else{
                    max_log = min_log = check_log;
                    firstObject = false;
                  }
                  
                }else{

                  if((result_query / pop) > max_lin)
                    max_lin = (result_query / pop);

                  if((result_query / pop) < min_lin)
                    min_lin = (result_query / pop);

                    check_log = Math.log10((result_query)/pop);
                 
                  if(check_log < min_log && check_log != "-Infinity")
                    min_log = check_log;

                  if(check_log > max_log && check_log != "-Infinity")
                    max_log = check_log;
                }
        }else{
          values_linear[features[key].properties.NAME] = "-"; //CAN'T BE NORMALIZED
          values_log[features[key].properties.NAME] = "-"; //CAN'T BE NORMALIZED
        }

      }

      scope.map.setQueryResult(scope.layerChosen,norm,'linear',values_linear);
      /*If the user wants cutomizable intervals, the dates shown are the same of linear visualization (normalized or not)*/
      scope.map.setQueryResult(scope.layerChosen,norm,'customizable',values_linear);
      scope.map.setQueryResult(scope.layerChosen,norm,'logarithmic',values_log);

      /*console.log("Max lin: "+max_lin);
      console.log("min_lin: "+min_lin);
      console.log("Max log: "+max_log);
      console.log("min_log: "+min_log);*/

      scope.map.setMaxValue(scope.layerChosen,norm,'linear',max_lin.toExponential(3));
      scope.map.setMaxValue(scope.layerChosen,norm,'logarithmic',max_log);
      scope.map.setMinValue(scope.layerChosen,norm,'linear',min_lin.toExponential(3));
      scope.map.setMinValue(scope.layerChosen,norm,'logarithmic',min_log);

      /*console.log(values_linear);
      console.log(values_log);*/

    };

    function calculateParamsIntervals(util){
      //LINEAR LEGEND (WITH MAX AND MIN VALUES)
      //MODIFY MAX AND MIN FOR LINEAR LEGEND
      var pattern_number = /[0-9 .]+(?=e[-+]*[0-9]+)/g;
      var pattern_exp = /e[-+]*[0-9]+/g;

      util['max_lin_exp'] = pattern_exp.exec(util['max_lin'].toString())[0];
      util['max_lin'] = Number(pattern_number.exec(util['max_lin'].toString())[0]);

      if(util['min_lin'] != 0){
        pattern_number = /[0-9 .]+(?=e[-+]*[0-9]+)/g;
        pattern_exp = /e[-+]*[0-9]+/g;
        util['min_lin_exp'] = pattern_exp.exec(util['min_lin'].toString());
        util['min_lin'] = Number(pattern_number.exec(util['min_lin'].toString())[0]);
      }

      util['max_lin'] = Number((Math.ceil(util['max_lin']*100)/100)+util['max_lin_exp']);
      util['min_lin'] = Number((Math.floor(util['min_lin']*100)/100)+util['min_lin_exp']);

      util['totRangeLin'] = util['max_lin'] - util['min_lin'];

      pattern_number = /[0-9 .]+(?=e[-+]*[0-9]+)/g;
      pattern_exp = /e[-+]*[0-9]+/g;

      util['value_lin_interval'] = (util['totRangeLin']/9).toExponential(3);

      util['value_lin_interval_exp'] = pattern_exp.exec(util['value_lin_interval'].toString())[0];
      util['value_lin_interval'] = Number(pattern_number.exec(util['value_lin_interval'].toString())[0]);
      
      util['value_lin_interval'] = Number((Math.ceil(util['value_lin_interval']*100)/100)+util['value_lin_interval_exp']);

      util['prev_value_lin'] = util['min_lin'];
      //console.log("prev_value_lin: "+ util['prev_value_lin']);

      //LOG LEGEND

      util['totRangeLog'] = Math.abs(Math.ceil(util['max_log']*10)/10 - Math.floor(util['min_log']*10)/10);
      var pow = Math.ceil(Math.abs(Math.log10(util['totRangeLog']/9)));
      util['value_log_interval'] = Math.ceil(util['totRangeLog']/9 * Math.pow(10,pow))/Math.pow(10,pow);
        
      util['prev_value_log'] = Math.floor(util['min_log']*10)/10;

      console.log("Math.abs(Math.ceil(util['max_log']*10)/10 :"+Math.ceil(util['max_log']*10)/10);
      console.log("Math.floor(util['min_log']*10)/10): "+Math.floor(util['min_log']*10)/10);
      console.log("util['totRangeLog'] : "+util['totRangeLog']);
      console.log("util['value_log_interval'] : "+util['value_log_interval']);
      
    };

    function calculateIntervalLegend(scope,normFlag){

      var intervals_linear = [];
      var intervals_log = [];
      var val_lin,val_log;
      var util = {};
      var norm = (normFlag == true)? "norm" : "notNorm";

      util['max_lin'] = scope.map.getMaxValue(scope.layerChosen,norm,'linear');
      util['min_lin'] = scope.map.getMinValue(scope.layerChosen,norm,'linear');
      util['max_lin_exp'] = "e+0";
      util['min_lin_exp'] = "e+0";
      util['value_lin_interval_exp'] = "e+0";
      util['min_log'] = scope.map.getMinValue(scope.layerChosen,norm,'logarithmic');
      util['max_log'] = scope.map.getMaxValue(scope.layerChosen,norm,'logarithmic');
      console.log('max_log: '+ util['max_log'] + '  , min_log: '+ util['min_log'] + '\nmax: '+util['max_lin']+', min: '+ util['min_lin']);

      //CALCULATE INTERVALS FOR BOTH LINEAR AND LOGARITHMIC LEGEND
      calculateParamsIntervals(util);
      //console.log(util);

      //clean scope.intervalsLegend
      scope.intervalsLegend[norm][scope.layerChosen]['logarithmic'] = [];
      scope.intervalsLegend[norm][scope.layerChosen]['linear'] = [];

      //set label "no data" for logarithmic
      scope.intervalsLegend[norm][scope.layerChosen]['logarithmic'].push("no data/can't be normalized");

      for(var i = 0 ; i < 9; i++){
        val_lin = Math.round((util['value_lin_interval']+util['prev_value_lin']) * 1e12) / 1e12;
        val_log = Math.round((util['value_log_interval']+util['prev_value_log']) * 1e12) / 1e12;

        intervals_linear.push(val_lin.toExponential());
        
        if(i == 0){

          intervals_log.push(Math.floor(util['min_log']*10)/10);
          intervals_log.push(val_log);

          scope.intervalsLegend[norm][scope.layerChosen]['logarithmic'].push('['+ (Math.floor(util['prev_value_log']*10)/10) + ' - ' + val_log + ']');
          scope.intervalsLegend[norm][scope.layerChosen]['linear'].push('['+ util['prev_value_lin'].toExponential() + ' - ' + val_lin.toExponential() + ']');
        }
        else{
          
          intervals_log.push(val_log);

          scope.intervalsLegend[norm][scope.layerChosen]['logarithmic'].push('('+ util['prev_value_log'] + ' - ' + val_log + ']');
          scope.intervalsLegend[norm][scope.layerChosen]['linear'].push('('+ util['prev_value_lin'].toExponential() + ' - ' + val_lin.toExponential() + ']'); 
        }

        util['prev_value_lin'] = Math.round((util['prev_value_lin'] + util['value_lin_interval']) * 1e12) / 1e12; //
        util['prev_value_log'] = Math.round((util['prev_value_log'] + util['value_log_interval']) * 1e12) / 1e12; //
        
      }

      scope.map.setIntervals(scope.layerChosen,norm,'linear',intervals_linear);
      scope.map.setIntervals(scope.layerChosen,norm,'logarithmic',intervals_log);

      /*console.log(intervals_log);
      console.log(intervals_linear)
      console.log(scope.intervalsLegend);*/

    };
		
		return {
      calculateIntervalLegend:calculateIntervalLegend,
      calculateQueryValues:calculateQueryValues
		}
	}
});