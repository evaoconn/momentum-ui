/**
 * Copyright (c) Cisco Systems, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */

import { customElementWithCheck } from "@/mixins/CustomElementCheck";
import { getLocaleDateFormat } from "@/utils/dateUtils";
import { property } from "lit-element";
import { DateTime } from "luxon";
import { DatePicker } from "../datepicker/DatePicker";
import { PropertyValues } from "lit";

const DATE_RANGE_SEPARATOR = " - ";
const DEFAULT_ARIA_LABEL = "Choose Date Range";
const DEFAULT_ARIA_LABEL_RANGE_SELECTED = "Choose Date Range, currently selected range is ";

export namespace DateRangePicker {
  @customElementWithCheck("md-date-range-picker")
  export class ELEMENT extends DatePicker.ELEMENT {

    @property({ type: String, attribute: "start-date", reflect: true }) public startDate: string | undefined | null = undefined;
    @property({ type: String, attribute: "end-date", reflect: true }) public endDate: string | undefined | null = undefined;
    @property({ type: Number, attribute: "max-range" }) public maxRange: number | undefined = undefined;


    public connectedCallback(): void {
      super.connectedCallback();
      this.addEventListener("date-pre-selection-change", this.handleDateSelection as EventListener);
      this.updateValue();
    }

    public updated(changedProperties: PropertyValues): void {
      super.updated(changedProperties);

      if (
        (changedProperties.has("startDate") || changedProperties.has("endDate")) &&
        !changedProperties.has("focusedDate")
      ) {
        this.updateValue();
      }
    }

    public disconnectedCallback(): void {
      super.disconnectedCallback();
      this.removeEventListener("date-pre-selection-change", this.handleDateSelection as EventListener);
    }


    // overload
    protected getPlaceHolderString(): string {
      if (this.placeholder) {
        return this.placeholder;
      }
      if (this.useISOFormat) {
        return `YYYY-MM-DD${DATE_RANGE_SEPARATOR}YYYY-MM-DD`;
      }
      const placeholder = getLocaleDateFormat(this.locale).toUpperCase();
      return `${placeholder}${DATE_RANGE_SEPARATOR}${placeholder}`;
    }

    protected isValueValid(): boolean {
      if (!this.validateDate) {
        return true;
      }
      const split = this.value?.split(DATE_RANGE_SEPARATOR) ?? [];
      return split.length === 2 && this.validateDateString(split[0]) && this.validateDateString(split[1]);
    }

    protected onApplyClick(): void {
      this.emitDateRange();
      this.updateValue();

      if (this.shouldCloseOnSelect) {
        this.setOpen(false);
      }
    }

    protected getDefaultAriaLabel(): string {
      if (this.startDate && this.endDate) {
        const startDateISO = DateTime.fromISO(this.startDate);
        const endDateISO = DateTime.fromISO(this.endDate);
        if (startDateISO.isValid && endDateISO.isValid) {
          return `${DEFAULT_ARIA_LABEL_RANGE_SELECTED}${startDateISO.toLocaleString(DateTime.DATE_FULL)} to ${endDateISO.toLocaleString(DateTime.DATE_FULL)}`; // TODO is the "to" alright here? ort should we havbe a template for the default range
        }
      }
      return DEFAULT_ARIA_LABEL;
    }

    // empty overload to stop prevent super's value change
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    protected setSelected(): void {}

    
    private updateValue(): void {
      if (this.startDate && this.endDate) {
        const formatDate = (dateString: string) =>
          this.useISOFormat
            ? dateString
            : DateTime.fromISO(dateString).toLocaleString(DateTime.DATE_SHORT, { locale: this.locale });

        const startDateString = formatDate(this.startDate);
        const endDateString = formatDate(this.endDate);

        this.value = `${startDateString}${DATE_RANGE_SEPARATOR}${endDateString}`;
      }
    }

    private dateToSqlTranslate(date: DateTime): string | null {
      return date.toSQLDate();
    }

    private readonly handleDateSelection = (e: CustomEvent<{ data: DateTime }>): void => {
      const selection = e.detail.data;
      if (!selection) {
        return;
      }

      this.selectedDate = selection;
      this.focusedDate = selection;

      if (!this.startDate) {
        this.startDate = this.dateToSqlTranslate(selection);
      } else if (!this.endDate) {
        if (selection < DateTime.fromISO(this.startDate)) {
          this.endDate = this.startDate;
          this.startDate = this.dateToSqlTranslate(selection);
        } else {
          this.endDate = this.dateToSqlTranslate(selection);
        }
      } else {
        this.startDate = this.dateToSqlTranslate(selection);
        this.endDate = undefined;
      }

      if (this.controlButtons?.apply) {
        return;
      }

      this.emitDateRange();
      this.updateValue();
    }

    private emitDateRange(): void {
      if (!this.startDate || !this.endDate) {
        return;
      }

      const event = new CustomEvent("date-range-change", {
        detail: {
          startDate: this.startDate,
          endDate: this.endDate
        }
      });
      this.dispatchEvent(event);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "md-date-range-picker": DateRangePicker.ELEMENT;
  }
}
