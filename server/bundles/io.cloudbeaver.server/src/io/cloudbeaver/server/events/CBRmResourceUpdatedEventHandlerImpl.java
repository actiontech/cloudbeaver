/*
 * DBeaver - Universal Database Manager
 * Copyright (C) 2010-2022 DBeaver Corp and others
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package io.cloudbeaver.server.events;

import io.cloudbeaver.events.CBEvent;
import io.cloudbeaver.events.CBEventConstants;
import io.cloudbeaver.model.session.WebSession;
import org.jkiss.code.NotNull;
import org.jkiss.dbeaver.model.app.DBPProject;
import org.jkiss.dbeaver.model.data.json.JSONUtils;

/**
 * Notify all active user session that rm resource has been updated
 */
public class CBRmResourceUpdatedEventHandlerImpl extends CBProjectUpdatedEventHandler {
    @NotNull
    @Override
    public String getSupportedEventType() {
        return CBEventConstants.CLOUDBEAVER_RM_RESOURCE_UPDATED;
    }

    @Override
    protected void updateSessionData(WebSession activeUserSession, CBEvent event) {
        String projectId = JSONUtils.getString(event.getEventData(), "project");
        DBPProject project = activeUserSession.getProjectById(projectId);
        if (project == null) {
            return;
        }
        activeUserSession.addSessionEvent(event);
    }
}