(function(angular, $, _) {

  angular.module('civicase').config(function($routeProvider) {
      $routeProvider.when('/case/list', {
        controller: 'CivicaseCaseList',
        templateUrl: '~/civicase/CaseList.html',
        resolve: {
          data: function(crmApi) {
            return crmApi({
              activityTypes: ['optionValue', 'get', {options: {limit: 0, sort: 'weight'}, 'option_group_id': 'activity_type', is_active: 1}],
              statuses: ['Case', 'getoptions', {field: 'status_id'}],
              caseTypes: ['Case', 'getoptions', {field: 'case_type_id'}]
            })
          }
        }
      });
    }
  );

  // CaseList controller
  angular.module('civicase').controller('CivicaseCaseList', function($scope, crmApi, crmStatus, crmUiHelp, crmThrottle, data) {
    // The ts() and hs() functions help load strings for this module.
    var ts = $scope.ts = CRM.ts('civicase');
    var ITEMS_PER_PAGE = 25,
      pageNum = 0;
    $scope.CRM = CRM;

    var caseTypes = $scope.caseTypes = data.caseTypes.values;
    var caseStatuses = $scope.caseStatuses = data.statuses.values;
    var activityTypes = $scope.activityTypes = _.indexBy(data.activityTypes.values, 'value');

    $scope.cases = [];

    $scope.nextPage = function() {
      ++pageNum;
      getCases(true);
    };

    $scope.selectAll = function(e) {
      var checked = e.target.checked;
      _.each($scope.cases, function(item) {
        item.selected = checked;
      });
    };

    $scope.isSelection = function(condition) {
      var count = _.filter($scope.cases, 'selected').length;
      if (condition === 'all') {
        return count === $scope.cases.length;
      } else if (condition === 'any') {
        return !!count;
      }
      return count === condition;
    };

    function formatCase(item) {
      item.myRole = [];
      item.client = [];
      item.status = caseStatuses[item.status_id];
      item.case_type = caseTypes[item.case_type_id];
      item.selected = false;
      _.each(item.contacts, function(contact) {
        if (!contact.relationship_type_id) {
          item.client.push(contact);
        }
        if (contact.contact_id == CRM.config.user_contact_id) {
          item.myRole.push(contact.role);
        }
        if (contact.manager) {
          item.manager = contact;
        }
      });
    }

    function getCases(nextPage) {
      if (nextPage !== true) {
        pageNum = 0;
      }
      crmThrottle(_loadCases).then(function(result) {
        var newCases = _.each(result.cases.values, formatCase);
        if (pageNum) {
          $scope.cases = $scope.cases.concat(newCases);
        } else {
          $scope.cases = newCases;
        }
        var remaining = result.count - (ITEMS_PER_PAGE * (pageNum + 1));
        $scope.remaining = remaining > 0 ? remaining : 0;
        if (!result.count && !pageNum) {
          $scope.remaining = false;
        }
      });
    }

    function _loadCases() {
      var returnParams = {
        sequential: 1,
        return: ['subject', 'case_type_id', 'status_id', 'contacts'],
        options: {
          limit: ITEMS_PER_PAGE,
          offset: ITEMS_PER_PAGE * pageNum
        }
      };
      var params = {
        is_deleted: 0
      };
      return crmApi({
        cases: ['Case', 'getwithactivities', $.extend(true, returnParams, params)],
        count: ['Case', 'getcount', params]
      });
    }

    getCases();

  });

})(angular, CRM.$, CRM._);
