;
(function(angular) {
  var indexOf = [].indexOf || function(item) {
    for (var i = 0, l = this.length; i < l; i++) {
      if (i in this && this[i] === item) return i;
    }
    return -1;
  };

  angular.module('pickadate.utils', [])
    .factory('pickadateUtils', ['dateFilter',
      function(dateFilter) {
        return {
          isDate: function(obj) {
            return Object.prototype.toString.call(obj) === '[object Date]';
          },

          stringToDate: function(dateString) {
            if (this.isDate(dateString)) return new Date(dateString);
            var dateParts = dateString.split('-'),
              year = dateParts[0],
              month = dateParts[1],
              day = dateParts[2];

            // set hour to 3am to easily avoid DST change
            return new Date(year, month - 1, day, 3);
          },

          dateRange: function(first, last, initial, format) {
            var date, i, _i, dates = [];

            if (!format) format = 'yyyy-MM-dd';

            for (i = _i = first; first <= last ? _i < last : _i > last; i = first <= last ? ++_i : --_i) {
              date = this.stringToDate(initial);
              date.setDate(date.getDate() + i);
              dates.push(dateFilter(date, format));
            }
            return dates;
          }
        };
      }
    ]);

  angular.module('pickadate', ['pickadate.utils'])

  .directive('type', ['$compile', '$timeout',
    function($compile, $timeout) {

      return function($scope, $element, attrs) {
        if (attrs.type !== 'date' || /chrome/i.test(navigator.userAgent)) {
          return angular.noop;
        }
        // var clientWidth = document.documentElement.clientWidth;
        var offset = tools.offset($element[0], window);
        var top = (offset.top+$element[0].offsetHeight+2)+'px';
        var left = offset.left+'px';
        
        var datePickerTemp = '<div class="pickadate-container" style="top:'+top+';left:'+left+'" pickadate ng-show="dateShow" ng-model="date" min-date="minDate" max-date="maxDate" disabled-dates=disabledDates></div>'
        var $div = angular.element(datePickerTemp);

        angular.element(document.body).append($div);

        $compile($div)($scope);

        $element.on('click', function(ev) {
          ev.stopPropagation();

          $timeout(function() {
              $scope.dateShow = !$scope.dateShow;
            }, 0);
        });

        angular.element(document).on('click', function(ev){
          $timeout(function() {
              $scope.dateShow = false;
            }, 0);
        });
      }
    }
  ])
    .directive('pickadate', ['$locale', 'pickadateUtils', 'dateFilter', '$compile',
      function($locale, dateUtils, dateFilter, $compile) {

        return {
          require: 'ngModel',
          scope: {
            date: '=ngModel',
            minDate: '=',
            maxDate: '=',
            disabledDates: '='
          },
          template: '<div class="pickadate" ng-click="$event.stopPropagation()">' +
            '<div class="pickadate-header">' +
            '<div class="pickadate-controls">' +
            '<a href="" class="pickadate-prev" ng-click="changeMonth(-1)" ng-show="allowPrevMonth">上月</a>' +
            '<a href="" class="pickadate-next" ng-click="changeMonth(1)" ng-show="allowNextMonth">下月</a>' +
            '</div>' +
            '<h3 class="pickadate-centered-heading">' +
            '{{currentDate | date:"MM yyyy"}}' +
            '</h3>' +
            '</div>' +
            '<div class="pickadate-body">' +
            '<div class="pickadate-main">' +
            '<ul class="pickadate-cell">' +
            '<li class="pickadate-head" ng-repeat="dayName in dayNames">' +
            '{{dayName}}' +
            '</li>' +
            '</ul>' +
            '<ul class="pickadate-cell">' +
            '<li ng-repeat="d in dates" ng-click="setDate(d)" class="{{d.className}}" ng-class="{\'pickadate-active\': date == d.date}">' +
            '{{d.date | date:"d"}}' +
            '</li>' +
            '</ul>' +
            '</div>' +
            '</div>' +
            '</div>',

          link: function(scope, element, attrs, ngModel) {
            var minDate = scope.minDate && dateUtils.stringToDate(scope.minDate),
              maxDate = scope.maxDate && dateUtils.stringToDate(scope.maxDate),
              disabledDates = scope.disabledDates || [],
              currentDate = new Date();

            // scope.dayNames = $locale.DATETIME_FORMATS['SHORTDAY'];
            scope.dayNames = ['星期天', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            scope.currentDate = currentDate;

            scope.render = function(initialDate) {

              initialDate = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1, 3);

              var currentMonth = initialDate.getMonth() + 1;
              var dayCount = new Date(initialDate.getFullYear(), initialDate.getMonth() + 1, 0, 3).getDate();

              var prevDates = dateUtils.dateRange(-initialDate.getDay(), 0, initialDate);
              var currentMonthDates = dateUtils.dateRange(0, dayCount, initialDate);

              var lastDate = dateUtils.stringToDate(currentMonthDates[currentMonthDates.length - 1]);
              var nextMonthDates = dateUtils.dateRange(1, 7 - lastDate.getDay(), lastDate);
              var allDates = prevDates.concat(currentMonthDates, nextMonthDates);
              var dates = [];
              var today = dateFilter(new Date(), 'yyyy-MM-dd');

              // Add an extra row if needed to make the calendar to have 6 rows
              if (allDates.length / 7 < 6) {
                allDates = allDates.concat(dateUtils.dateRange(1, 8, allDates[allDates.length - 1]));
              }

              var nextMonthInitialDate = new Date(initialDate);
              nextMonthInitialDate.setMonth(currentMonth);

              scope.allowPrevMonth = !minDate || initialDate > minDate;
              scope.allowNextMonth = !maxDate || nextMonthInitialDate < maxDate;

              for (var i = 0; i < allDates.length; i++) {
                var className = "",
                  date = allDates[i];

                if (date < scope.minDate || date > scope.maxDate || dateFilter(date, 'M') !== currentMonth.toString()) {
                  className = 'pickadate-disabled';
                } else if (indexOf.call(disabledDates, date) >= 0) {
                  className = 'pickadate-disabled pickadate-unavailable';
                } else {
                  className = 'pickadate-enabled';
                }

                if (date === today) {
                  className += ' pickadate-today';
                }

                dates.push({
                  date: date,
                  className: className
                });
              }

              scope.dates = dates;
            };

            scope.setDate = function(dateObj) {

              if (isDateDisabled(dateObj)) return;
              ngModel.$setViewValue(dateObj.date);
            };

            ngModel.$render = function() {
              // console.log(ngModel)
              if ((date = ngModel.$modelValue) && (indexOf.call(disabledDates, date) === -1)) {
                scope.currentDate = currentDate = dateUtils.stringToDate(date);
              } else if (date) {
                // if the initial date set by the user is in the disabled dates list, unset it
                scope.setDate({});
              }
              scope.render(currentDate);
            };

            scope.changeMonth = function(offset) {
              // If the current date is January 31th, setting the month to date.getMonth() + 1
              // sets the date to March the 3rd, since the date object adds 30 days to the current
              // date. Settings the date to the 2nd day of the month is a workaround to prevent this
              // behaviour
              currentDate.setDate(1);
              currentDate.setMonth(currentDate.getMonth() + offset);
              scope.render(currentDate);
            };

            function isDateDisabled(dateObj) {
              return (/pickadate-disabled/.test(dateObj.className));
            }
          }
        };
      }
    ]);
})(window.angular);