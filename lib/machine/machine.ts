/*
 * Copyright © 2018 Atomist, Inc.
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

import {
    Autofix,
    onAnyPush,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
    AutoCodeInspection,
    goals,
    whenPushSatisfies,
} from "@atomist/sdm";
import {
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";

import {
    springFormat, IsJava,
} from "@atomist/sdm-pack-spring";

import {
    withLegacyFiltering, legacyFiltering,
} from "@atomist/sdm-pack-issue";

import {
checkstyleReviewerRegistration,
} from "@atomist/sdm-pack-checkstyle";

/**
 * Initialize an sdm definition, and add functionality to it.
 *
 * @param configuration All the configuration for this service
 */
export function machine(
    configuration: SoftwareDeliveryMachineConfiguration,
): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine({
        name: "Spring Format SDM",
        configuration,
    });

    const autofixGoal = new Autofix()
        .with(springFormat(configuration));

    const inspectGoal = withLegacyFiltering(
        new AutoCodeInspection()
            .with(checkstyleReviewerRegistration({
                checkstylePath: "/Users/rodjohnson/sforzando-dev/idea-projects/sdm-pack-checkstyle/test/checkstyle-8.8-all.jar",
            })).withListener({
                name: "messager",
                listener: async rii => {
                    return rii.addressChannels(`There are ${rii.review.comments.length} issues`);
                },
            }),
        );
    const reviewGoals = goals("Inspect").plan(inspectGoal).after(autofixGoal);

    sdm.addExtensionPacks(legacyFiltering({inspectGoal, autofixGoal}));

    // On any push, perform autofixes, which will push to current branch
    return sdm.withPushRules(
        onAnyPush().setGoals(autofixGoal),
        whenPushSatisfies(IsJava).setGoals(reviewGoals),
    );
}
