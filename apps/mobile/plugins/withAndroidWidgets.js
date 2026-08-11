const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const ACTIVE_TRIP_XML_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="70dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/active_trip_overview_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

const LOCAL_INFO_XML_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="180dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/quick_local_info_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

const BUDGET_XML_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="320dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/budget_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

const ACTIVE_TRIP_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#4F46E5"
    android:padding="12dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal">
        <TextView
            android:id="@+id/trip_destination"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="France"
            android:textColor="#FFFFFF"
            android:textSize="16sp"
            android:textStyle="bold" />
        <TextView
            android:id="@+id/trip_days_left"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="5 Days Left"
            android:textColor="#FFFFFF"
            android:background="#33FFFFFF"
            android:paddingHorizontal="8dp"
            android:paddingVertical="2dp"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/trip_date_range"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Aug 15 — Aug 25, 2026"
        android:textColor="#E2E8F0"
        android:textSize="11sp"
        android:layout_marginTop="4dp" />

    <TextView
        android:id="@+id/trip_exchange_rate"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="1 USD = 0.92 EUR"
        android:textColor="#FEF08A"
        android:textSize="12sp"
        android:textStyle="bold"
        android:layout_marginTop="8dp" />
</LinearLayout>`;

const LOCAL_INFO_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#1E293B"
    android:padding="12dp">

    <TextView
        android:id="@+id/local_country"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Local Info · France"
        android:textColor="#F8FAFC"
        android:textSize="14sp"
        android:textStyle="bold" />

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="8dp">
        <TextView
            android:id="@+id/emerg_police"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Police: 17"
            android:textColor="#EF4444"
            android:textSize="11sp"
            android:textStyle="bold" />
        <TextView
            android:id="@+id/emerg_ambulance"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Amb: 15"
            android:textColor="#3B82F6"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="4dp">
        <TextView
            android:id="@+id/emerg_fire"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="Fire: 18"
            android:textColor="#F59E0B"
            android:textSize="11sp"
            android:textStyle="bold" />
        <TextView
            android:id="@+id/emerg_general"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:text="General: 112"
            android:textColor="#10B981"
            android:textSize="11sp"
            android:textStyle="bold" />
    </LinearLayout>

    <TextView
        android:id="@+id/upcoming_holiday"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Upcoming Holiday: Assumption of Mary (Sat, Aug 15)"
        android:textColor="#FDE68A"
        android:textSize="11sp"
        android:layout_marginTop="10dp" />
</LinearLayout>`;

const BUDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#1E293B"
    android:padding="12dp">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="Trip Budget &amp; Expenses"
        android:textColor="#F8FAFC"
        android:textSize="14sp"
        android:textStyle="bold" />

    <TextView
        android:id="@+id/budget_spent"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="€504 spent"
        android:textColor="#10B981"
        android:textSize="18sp"
        android:textStyle="bold"
        android:layout_marginTop="4dp" />

    <TextView
        android:id="@+id/budget_remaining"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="€696 remaining of €1,200"
        android:textColor="#94A3B8"
        android:textSize="11sp" />

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="RECENT EXPENSES"
        android:textColor="#94A3B8"
        android:textSize="10sp"
        android:textStyle="bold"
        android:layout_marginTop="10dp" />

    <TextView
        android:id="@+id/expense_1_name"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textColor="#F1F5F9"
        android:textSize="11sp"
        android:layout_marginTop="4dp" />

    <TextView
        android:id="@+id/expense_2_name"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textColor="#F1F5F9"
        android:textSize="11sp"
        android:layout_marginTop="2dp" />

    <TextView
        android:id="@+id/expense_3_name"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textColor="#F1F5F9"
        android:textSize="11sp"
        android:layout_marginTop="2dp" />

    <Button
        android:id="@+id/add_expense_btn"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="+ Add Expense"
        android:backgroundTint="#8B5CF6"
        android:textColor="#FFFFFF"
        android:layout_marginTop="10dp" />
</LinearLayout>`;

const KOTLIN_ACTIVE_TRIP_WIDGET = `package com.triphandy.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import es.dionisiocaceres.HomeWidgetPlugin

class ActiveTripOverviewWidget : AppWidgetProvider() {
    override function onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val widgetData = HomeWidgetPlugin.getData(context)
            val views = RemoteViews(context.packageName, R.layout.active_trip_overview_widget).apply {
                setTextViewText(R.id.trip_destination, widgetData.getString("trip_destination", "No Active Trip"))
                setTextViewText(R.id.trip_days_left, widgetData.getString("trip_days_left", "Plan a trip"))
                setTextViewText(R.id.trip_date_range, widgetData.getString("trip_date_range", ""))
                setTextViewText(R.id.trip_exchange_rate, widgetData.getString("trip_exchange_rate", ""))
            }
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}`;

const KOTLIN_LOCAL_INFO_WIDGET = `package com.triphandy.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews
import es.dionisiocaceres.HomeWidgetPlugin

class QuickLocalInfoWidget : AppWidgetProvider() {
    override function onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val widgetData = HomeWidgetPlugin.getData(context)
            val country = widgetData.getString("local_country", "France")
            val views = RemoteViews(context.packageName, R.layout.quick_local_info_widget).apply {
                setTextViewText(R.id.local_country, "Local Info · $country")
                setTextViewText(R.id.emerg_police, "Police: " + widgetData.getString("emerg_police", "17"))
                setTextViewText(R.id.emerg_ambulance, "Amb: " + widgetData.getString("emerg_ambulance", "15"))
                setTextViewText(R.id.emerg_fire, "Fire: " + widgetData.getString("emerg_fire", "18"))
                setTextViewText(R.id.emerg_general, "General: " + widgetData.getString("emerg_general", "112"))
                setTextViewText(R.id.upcoming_holiday, widgetData.getString("upcoming_holiday", "No upcoming holidays"))
            }
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}`;

const KOTLIN_BUDGET_WIDGET = `package com.triphandy.app

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import es.dionisiocaceres.HomeWidgetPlugin

class BudgetWidget : AppWidgetProvider() {
    override function onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        for (appWidgetId in appWidgetIds) {
            val widgetData = HomeWidgetPlugin.getData(context)
            val views = RemoteViews(context.packageName, R.layout.budget_widget).apply {
                setTextViewText(R.id.budget_spent, widgetData.getString("budget_spent", "€0 spent"))
                setTextViewText(R.id.budget_remaining, widgetData.getString("budget_remaining", "€0 remaining"))

                val exp1Name = widgetData.getString("expense_1_name", "")
                val exp1Date = widgetData.getString("expense_1_date", "")
                val exp1Amount = widgetData.getString("expense_1_amount", "")
                val line1 = if (exp1Name.isNotEmpty()) "$exp1Name  [$exp1Date]  $exp1Amount" else ""

                val exp2Name = widgetData.getString("expense_2_name", "")
                val exp2Date = widgetData.getString("expense_2_date", "")
                val exp2Amount = widgetData.getString("expense_2_amount", "")
                val line2 = if (exp2Name.isNotEmpty()) "$exp2Name  [$exp2Date]  $exp2Amount" else ""

                val exp3Name = widgetData.getString("expense_3_name", "")
                val exp3Date = widgetData.getString("expense_3_date", "")
                val exp3Amount = widgetData.getString("expense_3_amount", "")
                val line3 = if (exp3Name.isNotEmpty()) "$exp3Name  [$exp3Date]  $exp3Amount" else ""

                setTextViewText(R.id.expense_1_name, line1)
                setTextViewText(R.id.expense_2_name, line2)
                setTextViewText(R.id.expense_3_name, line3)

                // Deep link intent to open Add Expense Modal
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse("triphandy://modules/budget-tracker?openModal=true"))
                val pendingIntent = PendingIntent.getActivity(
                    context, 0, intent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
                setOnClickPendingIntent(R.id.add_expense_btn, pendingIntent)
            }
            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }
}`;

function withAndroidWidgets(config) {
  config = withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];
    if (!mainApplication.receiver) {
      mainApplication.receiver = [];
    }

    const receiversToAdd = [
      {
        name: '.ActiveTripOverviewWidget',
        label: 'Active Trip Overview',
        xmlInfo: '@xml/active_trip_overview_widget_info'
      },
      {
        name: '.QuickLocalInfoWidget',
        label: 'Quick Local Info',
        xmlInfo: '@xml/quick_local_info_widget_info'
      },
      {
        name: '.BudgetWidget',
        label: 'Budget & Expenses',
        xmlInfo: '@xml/budget_widget_info'
      }
    ];

    receiversToAdd.forEach((r) => {
      const exists = mainApplication.receiver.some((rec) => rec.$['android:name'] === r.name);
      if (!exists) {
        mainApplication.receiver.push({
          $: {
            'android:name': r.name,
            'android:exported': 'true',
            'android:label': r.label,
          },
          'intent-filter': [
            {
              action: [
                {
                  $: {
                    'android:name': 'android.appwidget.action.APPWIDGET_UPDATE',
                  },
                },
              ],
            },
          ],
          'meta-data': [
            {
              $: {
                'android:name': 'android.appwidget.provider',
                'android:resource': r.xmlInfo,
              },
            },
          ],
        });
      }
    });

    return config;
  });

  config = withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const resDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');
      const javaDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'triphandy', 'app');

      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(javaDir, { recursive: true });

      // Write xml info files
      fs.writeFileSync(path.join(xmlDir, 'active_trip_overview_widget_info.xml'), ACTIVE_TRIP_XML_INFO);
      fs.writeFileSync(path.join(xmlDir, 'quick_local_info_widget_info.xml'), LOCAL_INFO_XML_INFO);
      fs.writeFileSync(path.join(xmlDir, 'budget_widget_info.xml'), BUDGET_XML_INFO);

      // Write layout files
      fs.writeFileSync(path.join(layoutDir, 'active_trip_overview_widget.xml'), ACTIVE_TRIP_LAYOUT);
      fs.writeFileSync(path.join(layoutDir, 'quick_local_info_widget.xml'), LOCAL_INFO_LAYOUT);
      fs.writeFileSync(path.join(layoutDir, 'budget_widget.xml'), BUDGET_LAYOUT);

      // Write Kotlin Provider classes
      fs.writeFileSync(path.join(javaDir, 'ActiveTripOverviewWidget.kt'), KOTLIN_ACTIVE_TRIP_WIDGET);
      fs.writeFileSync(path.join(javaDir, 'QuickLocalInfoWidget.kt'), KOTLIN_LOCAL_INFO_WIDGET);
      fs.writeFileSync(path.join(javaDir, 'BudgetWidget.kt'), KOTLIN_BUDGET_WIDGET);

      return config;
    },
  ]);

  return config;
}

module.exports = withAndroidWidgets;
