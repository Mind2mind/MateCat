UI = null;

UI = {
    init: function () {
        this.Search = {};
        this.Search.filter = {};
        this.renderMoreProjects = this.renderMoreProjects.bind(this);
        this.openJobSettings = this.openJobSettings.bind(this);
        this.changeJobsOrProjectStatus = this.changeJobsOrProjectStatus.bind(this);
        this.changeJobPassword = this.changeJobPassword.bind(this);
        this.changeTeam = this.changeTeam.bind(this);
        this.selectedUser = ManageConstants.ALL_MEMBERS_FILTER;

        this.popupInfoTeamsStorageName = 'infoTeamPopup-' + config.userMail;

        //Job Actions
        ProjectsStore.addListener(ManageConstants.OPEN_JOB_SETTINGS, this.openJobSettings);
        ProjectsStore.addListener(ManageConstants.OPEN_JOB_TM_PANEL, this.openJobTMPanel);

        //Modals
        TeamsStore.addListener(ManageConstants.OPEN_CREATE_TEAM_MODAL, this.openCreateTeamModal);
        TeamsStore.addListener(ManageConstants.OPEN_MODIFY_TEAM_MODAL, this.openModifyTeamModal);
        TeamsStore.addListener(ManageConstants.OPEN_CHANGE_TEAM_MODAL, this.openChangeTeamModal.bind(this));
    },

    render: function () {
        var self = this;
        var headerMountPoint = $("header")[0];
        this.Search.currentPage = 1;
        this.pageLeft = false;
        ReactDOM.render(React.createElement(Header), headerMountPoint);




        window.addEventListener('scroll', this.scrollDebounceFn());

        $(window).on("blur focus", function(e) {
            var prevType = $(this).data("prevType");

            if (prevType != e.type) {   //  reduce double fire issues
                switch (e.type) {
                    case "blur":
                        console.log("leave page");
                        self.pageLeft = true;
                        // clearInterval(UI.reloadProjectsInterval);
                        break;
                    case "focus":
                        // clearInterval(UI.reloadProjectsInterval);
                        console.log("Enter page");
                        // UI.reloadProjectsInterval = setInterval(function () {
                        //     console.log("Reload Projects");
                        //     self.reloadProjects();
                        // }, 5e3);
                        if (self.pageLeft) {
                            self.reloadProjects();
                        }
                        break;
                }
            }

            $(this).data("prevType", e.type);
        });

        this.getAllTeams().done(function (data) {

            self.teams = data.teams;
            ManageActions.renderTeams(self.teams);
            self.selectedTeam = APP.getLastTeamSelected(self.teams);
            self.getTeamStructure(self.selectedTeam).done(function () {
                ManageActions.selectTeam(self.selectedTeam);
                self.checkPopupInfoTeams();
                self.getProjects(self.selectedTeam).done(function(response){
                    self.renderProjects(response.data);
                });
            });
        });

    },

    reloadProjects: function () {
        var self = this;
        if ( UI.Search.currentPage === 1) {
            this.getProjects(self.selectedTeam).done(function (response) {
                var projects = response.data;
                ManageActions.updateProjects(projects);
            });
        } else {
            // ManageActions.showReloadSpinner();
            var total_projects = [];
            var requests = [];
            var onDone = function (response) {
                        var projects = response.data;
                        $.merge(total_projects, projects);
                    };
            for (var i=1; i<= UI.Search.currentPage; i++ ) {
                requests.push(this.getProjects(self.selectedTeam, i));
            }
            $.when.apply(this, requests).done(function() {
                var results = requests.length > 1 ? arguments : [arguments];
                for( var i = 0; i < results.length; i++ ){
                    onDone(results[i][0]);
                }
                ManageActions.updateProjects(total_projects);
            });
        }
        this.getAllTeams(true).done(function (data) {
            self.teams = data.teams;
            ManageActions.updateTeams(self.teams);
        });

    },

    renderProjects: function (projects) {
        APP.beforeRenderProjects = new Date();
        if ( !this.ProjectsContainer ) {
            var mountPoint = $("#manage-container")[0];
            this.ProjectsContainer = ReactDOM.render(React.createElement(ProjectsContainer, {
                getLastActivity: this.getLastProjectActivityLogAction,
                changeJobPasswordFn: this.changeJobPassword,
                downloadTranslationFn : this.downloadTranslation
            }), mountPoint);
        }

        ManageActions.renderProjects(projects, this.selectedTeam, this.teams);
    },

    renderMoreProjects: function () {
        UI.Search.currentPage = UI.Search.currentPage + 1;
        this.getProjects(this.selectedTeam).done(function (response) {
            var projects = response.data;
            if (projects.length > 0) {
                ManageActions.renderMoreProjects(projects);
            } else {
                ManageActions.noMoreProjects();
            }
        });
    },

    removeUserFilter: function (uid) {
        if (UI.Search.filter.id_assignee == uid) {
            delete UI.Search.filter.id_assignee;
        }
    },

    /**
     * Open the settings for the job
     */
    openJobSettings: function (job, prName) {
        var url = '/translate/'+ prName +'/'+ job.source +'-'+ job.target +'/'+ job.id +'-'+ job.password + '&openTab=options' ;
        window.open(url, '_blank');
        setTimeout(function () {
            $.cookie('tmpanel-open', 0, { path: '/' });
        }, 2000);
    },
    /**
     * Open the tm panel for the job
     */
    openJobTMPanel: function (job, prName) {
        var url = '/translate/'+ prName +'/'+ job.source +'-'+ job.target +'/'+ job.id +'-'+ job.password + '&openTab=tm' ;
        window.open(url, '_blank');
        setTimeout(function () {
            $.cookie('tmpanel-open', 0, { path: '/' });
        }, 2000);
    },

    /**
     *
     * @param type Job or Project: obj, prj
     * @param object
     * @param status
     * @param only_if
     */
     changeJobsOrProjectStatus: function(type,object,status,only_if) {
        // Se Job cancella tutti arJobs = 21-10d78b343b8e:active

        if(typeof only_if == 'undefined') only_if = 0;

        var id = object.id;
        var password = object.password;

        var data = {
            action:		"changeJobsStatus",
            new_status: status,
            res: 		type,            //Project or Job:
            id:			id,             // Job or Project Id
            password:   password,          // Job or Project Password
            page:		UI.Search.currentPage,        //The pagination ??
            only_if:	only_if,        // State before, for example resume project change to 'active' only_if previous state is archived
            undo:		0               // ?? REMOVED in backend endpoint. If needed, this MUST be re-implemented with sanity....
        };

        // Filters
        data = $.extend(data,UI.Search.filter);

        return APP.doRequest({
            data: data,
            success: function(d){},
            error: function(d){}
        });
    },

    getAllTeams: function (force) {
        if ( APP.USER.STORE.teams && !force) {
            var data = {
                teams: APP.USER.STORE.teams
            };
            var deferred = $.Deferred().resolve(data);
            return deferred.promise();
        } else {
            return APP.USER.loadUserData();
        }

    },

    changeTeam: function (team) {

        var self = this;
        this.selectedTeam = team;
        this.selectedUser = ManageConstants.ALL_MEMBERS_FILTER;
        this.Search.filter = {};
        UI.Search.currentPage = 1;
        APP.setTeamInStorage(team.id);
        return this.getTeamStructure(team).then(function () {
                return self.getProjects(self.selectedTeam);
            }
        );
    },

    getTeamStructure: function (team) {
        var self = this;
        return this.getTeamMembers(team.id).then(function (data) {
            self.selectedTeam.members = data.members;
            self.selectedTeam.pending_invitations = data.pending_invitations;
        });
    },

    filterProjects: function(userUid, name, status) {
        var self = this;
        this.Search.filter = {};
        this.Search.currentPage = 1;
        var filter = {};
        if (typeof userUid != "undefined") {
             if (userUid === ManageConstants.NOT_ASSIGNED_FILTER) {
                filter.no_assignee = true;
            } else if (userUid !== ManageConstants.ALL_MEMBERS_FILTER) {
                filter.id_assignee = userUid;
            }
            this.selectedUser = userUid;
        }
        if ((typeof name !== "undefined") ) {
            filter.pn = name;
        }
        if ((typeof status !== "undefined") ) {
            filter.status = status;
        }
        this.Search.filter = $.extend( this.Search.filter, filter );
        if (!_.isEmpty(this.Search.filter)) {
            UI.Search.currentPage = 1;
        }
        return this.getProjects(this.selectedTeam);
    },

    scrollDebounceFn: function() {
        var self = this;
        return _.debounce(function() {
            self.handleScroll();
        }, 300)
    },

    handleScroll: function() {
        if($(window).scrollTop() + $(window).height() > $(document).height() - 200) {
            console.log("Scroll end");
            this.renderMoreProjects();
        }
    },

    checkPopupInfoTeams: function () {
        var openPopup = localStorage.getItem(this.popupInfoTeamsStorageName);
        if (!openPopup) {
            ManageActions.openPopupTeams();
        }
    },

    setPopupTeamsCookie: function () {
        localStorage.setItem(this.popupInfoTeamsStorageName, true);
    },

    showNotificationProjectsChanged: function () {
        var notification = {
            title: 'Ooops...',
            text: 'Something went wrong, the project has been assigned to another member or moved to another team.',
            type: 'warning',
            position: 'tc',
            allowHtml: true,
            autoDismiss: false,
        };
        var boxUndo = APP.addNotification(notification);
    },

    selectPersonalTeam: function () {
        var personalTeam = this.teams.find(function (team) {
            return team.type == 'personal';
        });
        ManageActions.changeTeam(personalTeam);
    },

    //********** REQUESTS *********************//

    /**
     * Retrieve Projects. Passing filters is possible to retrieve projects
     */
    getProjects: function(team, page) {
        var pageNumber = (page) ? page : UI.Search.currentPage;
        var data = {};
        // if (team.type == 'personal') {
        //     this.Search.filter.id_assignee = APP.USER.STORE.user.uid;
        //     data = {
        //         action: 'getProjects',
        //         page:	pageNumber,
        //         filter: (!$.isEmptyObject(UI.Search.filter)) ? 1 : 0,
        //     };
        // } else {
            data = {
                action: 'getProjects',
                id_team: team.id,
                page:	pageNumber,
                filter: (!$.isEmptyObject(UI.Search.filter)) ? 1 : 0,
            };
        // }

        // Filters
        data = $.extend(data,UI.Search.filter);

        return APP.doRequest({
            data: data,
            success: function(d){

                if (typeof d.errors != 'undefined' && d.errors.length && d.errors[0].code === 401   ) { //Not Logged or not in the team
                    window.location.reload();
                } else if( typeof d.errors != 'undefined' && d.errors.length && d.errors[0].code === 404){
                    UI.selectPersonalTeam();
                    // UI.reloadProjects();
                } else if( typeof d.errors != 'undefined' && d.errors.length ){
                    window.location = '/';
                }
            },
            error: function(d){
                window.location = '/';
            }
        });
    },

    createTeam: function (teamName, members) {
        var data = {
            type: 'general',
            name: teamName,
            members: members
        };
        return $.ajax({
            async: true,
            data: data,
            type: "POST",
            url : "/api/v2/teams"
        });

    },

    getTeamMembers: function (teamId) {
        return $.ajax({
            async: true,
            type: "get",
            url : "/api/v2/teams/" + teamId + "/members"
        });
    },

    downloadTranslation: function(project, job, urlWarnings) {

        var continueDownloadFunction ;
        var callback = ManageActions.enableDownloadButton.bind(null, job.id);

        if ( project.remote_file_service == 'gdrive' ) {
            continueDownloadFunction = function() {
                APP.ModalWindow.onCloseModal();
                ManageActions.disableDownloadButton(job.id);
                APP.downloadGDriveFile(null, job.id, job.password ,callback);
            }
        }
        else  {
            continueDownloadFunction = function() {
                APP.ModalWindow.onCloseModal();
                ManageActions.disableDownloadButton(job.id);
                APP.downloadFile(job.id, job.password, callback);
            }
        }

        var openUrl = function () {
            APP.ModalWindow.onCloseModal();
            ManageActions.enableDownloadButton(job.id);
            window.open(urlWarnings, '_blank');
        };

        //the translation mismatches are not a severe Error, but only a warn, so don't display Error Popup
        if ( job.warnings_count > 0 ) {
            var props = {
                text: 'Potential errors (e.g. tag mismatches, inconsistencies etc.) found in the text. ' +
                'If you continue, your download may fail or part of the content be untranslated - search ' +
                'the string "UNTRANSLATED_CONTENT" in the downloaded file(s).<br><br>Continue downloading ' +
                'or fix the error in MateCat:',
                successText: "Continue",
                successCallback: continueDownloadFunction,
                warningText: "Fix errors",
                warningCallback: openUrl

            };
            APP.ModalWindow.showModalComponent(ConfirmMessageModal, props, "Confirmation required");
        } else {
            continueDownloadFunction();
        }

    },



    getLastProjectActivityLogAction: function (id, pass) {
        return $.ajax({
            async: true,
            type: "get",
            url : "/api/v2/activity/project/" + id + "/" + pass + "/last",
        });
    },

    changeProjectName: function (idOrg, idProject, newName) {
        var data = {
            name: newName
        };
        return $.ajax({
            data: JSON.stringify(data),
            type: "PUT",
            url : "/api/v2/teams/" + idOrg + "/projects/" + idProject,
        });
    },

    changeProjectAssignee: function (idOrg, idProject, newUserId) {
        //Pass null to unassign a Project
        var idAssignee = (newUserId == '-1') ? null : newUserId;
        var data = {
            id_assignee: idAssignee
        };
        return $.ajax({
            data: JSON.stringify(data),
            type: "put",
            url : "/api/v2/teams/" + idOrg + "/projects/" + idProject,
        });
    },

    /**
     * Change the password for the job
     * @param job
     * @param undo
     * @param old_pass
     */
    changeJobPassword: function(job, undo, old_pass) {
        var id = job.id;
        var password = job.password;

        return APP.doRequest({
            data: {
                action:		    "changePassword",
                res: 		    'obj',
                id: 		    id,
                password: 	    password,
                old_password: 	old_pass,
                undo:           undo
            },
            success: function(d){}
        });
    },

    addUserToTeam: function (team, userEmail) {
        var email = (typeof userEmail === "string") ? [userEmail] : userEmail;
        var data = {
            members: email
        };
        return $.ajax({
            data: data,
            type: "post",
            url : "/api/v2/teams/"+ team.id +"/members",
        });
    },

    removeUserFromTeam: function (team, userId) {
        return $.ajax({id_team: team.id,
            type: "delete",
            url : "/api/v2/teams/"+ team.id +"/members/" + userId,
        });
    },

    changeTeamName: function (team, newName) {
        var data = {
            name: newName
        };
        return $.ajax({
            data: JSON.stringify(data),
            type: "PUT",
            url : "/api/v2/teams/" + team.id,
        });
    },

    changeProjectTeam: function (newTeamId, project) {
        var data = {
            id_team: newTeamId
        };
        return $.ajax({
            data: JSON.stringify(data),
            type: "PUT",
            url : "/api/v2/teams/" + project.id_team + "/projects/" + project.id
        });
    },

    //*******************************//

    //********* Modals **************//

    openCreateTeamModal: function () {
        APP.ModalWindow.showModalComponent(CreateTeamModal, {}, "Create New Team");
    },

    openModifyTeamModal: function (team, hideChangeName) {
        var props = {
            team: team,
            hideChangeName: hideChangeName
        };
        APP.ModalWindow.showModalComponent(ModifyTeamModal, props, "Modify Team");
    },

    openChangeTeamModal: function (teams, project) {
        var props = {
            teams: teams,
            project: project,
            selectedTeam: this.selectedTeam.id
        };
        APP.ModalWindow.showModalComponent(ChangeTeamModal, props, "Move project");
    },

    openOutsourceModal: function (project, job, url) {
        var props = {
            project: project,
            job: job,
            url: url,
            fromManage: true,
            translatorOpen: true,
            onCloseCallback: function () {

            }
        };
        var style = {width: '970px',maxWidth: '970px'};
        APP.ModalWindow.showModalComponent(OutsourceModal, props, "Translate", style);
    },

    openSplitJobModal: function (job, project) {
        var props = {
            job: job,
            project: project
        };
        var style = {width: '670px',maxWidth: '670px'};
        APP.ModalWindow.showModalComponent(SplitJobModal, props, "Split Job", style);
    },

    /****** Analyze *******/
    checkSplitRequest: function (job, project, numsplit, arrayValues) {
        return APP.doRequest({
            data: {
                action: "splitJob",
                exec: "check",
                project_id: project.id,
                project_pass: project.password,
                job_id: job.id,
                job_pass: job.password,
                num_split: numsplit,
                split_values: arrayValues
            },
            success: function(d) {}
        });
    },

    confirmSplitRequest: function(job, project, numsplit, arrayValues) {

        return APP.doRequest({
            data: {
                action: "splitJob",
                exec: "apply",
                project_id: project.id,
                project_pass: project.password,
                job_id: job.id,
                job_pass: job.password,
                num_split: numsplit,
                split_values: arrayValues
            }
        });
    },
    openMergeModal: function (project, job) {
        var props = {
            text: 'This will cause the merging of all chunks in only one job. ' +
            'This operation cannot be canceled.',
            successText: "Continue",
            successCallback: function () {
                UI.confirmMerge(project, job);
                UI.reloadProjects();
                APP.ModalWindow.onCloseModal();
            },
            cancelText: "Cancel",
            cancelCallback: function () {
                APP.ModalWindow.onCloseModal();
            }

        };
        APP.ModalWindow.showModalComponent(ConfirmMessageModal, props, "Confirmation required");
    },
    confirmMerge: function(project, job) {

        return APP.doRequest({
            data: {
                action: "splitJob",
                exec: "merge",
                project_id: project.id,
                project_pass: project.password,
                job_id: job.id
            }

        });
    }
    /**********************/
};



$(document).ready(function(){
    UI.init();
    UI.render();
});