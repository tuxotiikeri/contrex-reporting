import { t } from "../i18n/index.js";
import { ErrorBoundary, For } from "solid-js";
import { numberUtils } from "../utils/utils";

export function Repetitions(props) {
  return (
    <ErrorBoundary fallback={t("Toistotietojen lataaminen epäonnistui")}>
      <Show when={props.repetitions}>
        <ul>
          <For
            each={Object.entries(props.repetitions).sort(([a], [b]) =>
              a.localeCompare(b),
            )}
          >
            {([key, values]) => (
              <li>
                {key}:
                <For each={values}>
                  {(value) => (
                    <span class="mx-2">
                      <Switch fallback={numberUtils.truncDecimals(value, 2)}>
                        <Match when={key.startsWith("torquePeakPos")}>
                          {numberUtils.truncDecimals(value, 2)}°{" "}
                        </Match>
                        <Match when={key.startsWith("torquePeak")}>
                          {numberUtils.truncDecimals(value, 2)}Nm{" "}
                        </Match>
                        <Match when={key.startsWith("powerAvg")}>
                          {numberUtils.truncDecimals(value, 2)}W{" "}
                        </Match>
                        <Match when={key.startsWith("powerPeak")}>
                          {numberUtils.truncDecimals(value, 2)}W{" "}
                        </Match>
                        <Match when={key.startsWith("power")}>
                          {numberUtils.truncDecimals(value, 2)} rad/s{" "}
                        </Match>
                        <Match when={key.startsWith("work")}>
                          {numberUtils.truncDecimals(value, 2)}J{" "}
                        </Match>
                        <Match when={key.startsWith("speedPeakPos")}>
                          {numberUtils.truncDecimals(value, 2)}°{" "}
                        </Match>
                        <Match when={key.startsWith("speed")}>
                          {numberUtils.truncDecimals(value, 2)} deg/s{" "}
                        </Match>
                      </Switch>
                    </span>
                  )}
                </For>
              </li>
            )}
          </For>
        </ul>
      </Show>
    </ErrorBoundary>
  );
}
