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
    android:minWidth="250dp"
    android:minHeight="180dp"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/quick_local_info_widget"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen">
</appwidget-provider>`;

const BUDGET_XML_INFO = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="180dp"
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
    android:gravity="top"
    android:padding="12dp">

    <!-- Row 1: Destination Name and Flag -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">
        <TextView
            android:id="@+id/trip_flag"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="🌍"
            android:textSize="14sp"
            android:layout_marginEnd="6dp" />
        <TextView
            android:id="@+id/local_country"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="France"
            android:textColor="#F8FAFC"
            android:textSize="14sp"
            android:textStyle="bold" />
    </LinearLayout>

    <!-- Row 2: Emergency Pills -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="vertical"
        android:layout_marginTop="8dp">

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:background="@drawable/pill_red"
            android:paddingHorizontal="10dp"
            android:paddingVertical="6dp"
            android:layout_marginBottom="4dp">
            <ImageView
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:src="@drawable/ic_police"
                android:layout_marginEnd="6dp" />
            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Police"
                android:textColor="#EF4444"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/emerg_police"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="17"
                android:textColor="#EF4444"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:background="@drawable/pill_blue"
            android:paddingHorizontal="10dp"
            android:paddingVertical="6dp"
            android:layout_marginBottom="4dp">
            <ImageView
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:src="@drawable/ic_ambulance"
                android:layout_marginEnd="6dp" />
            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Ambulance"
                android:textColor="#3B82F6"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/emerg_ambulance"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="15"
                android:textColor="#3B82F6"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:background="@drawable/pill_orange"
            android:paddingHorizontal="10dp"
            android:paddingVertical="6dp"
            android:layout_marginBottom="4dp">
            <ImageView
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:src="@drawable/ic_fire"
                android:layout_marginEnd="6dp" />
            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="Fire"
                android:textColor="#F59E0B"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/emerg_fire"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="18"
                android:textColor="#F59E0B"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>

        <LinearLayout
            android:layout_width="match_parent"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical"
            android:background="@drawable/pill_green"
            android:paddingHorizontal="10dp"
            android:paddingVertical="6dp">
            <ImageView
                android:layout_width="14dp"
                android:layout_height="14dp"
                android:src="@drawable/ic_general"
                android:layout_marginEnd="6dp" />
            <TextView
                android:layout_width="0dp"
                android:layout_height="wrap_content"
                android:layout_weight="1"
                android:text="General"
                android:textColor="#10B981"
                android:textSize="11sp"
                android:textStyle="bold" />
            <TextView
                android:id="@+id/emerg_general"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:text="112"
                android:textColor="#10B981"
                android:textSize="11sp"
                android:textStyle="bold" />
        </LinearLayout>
    </LinearLayout>

    <!-- Row 3: Upcoming Holidays -->
    <TextView
        android:id="@+id/upcoming_holiday"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="No upcoming holidays"
        android:textColor="#94A3B8"
        android:textSize="10sp"
        android:layout_marginTop="8dp" />
</LinearLayout>`;

const BUDGET_LAYOUT = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#1E293B"
    android:padding="12dp">

    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="0dp"
        android:layout_weight="1"
        android:orientation="vertical">

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
    </LinearLayout>

    <Button
        android:id="@+id/add_expense_btn"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:text="+ Add Expense"
        android:backgroundTint="#8B5CF6"
        android:textColor="#FFFFFF" />
</LinearLayout>`;

const JAVA_HOME_WIDGET_PROVIDER = `package com.reactnativehomewidget;

import android.appwidget.AppWidgetProvider;

public class HomeWidgetProvider extends AppWidgetProvider {
}`;

const KOTLIN_ACTIVE_TRIP_WIDGET = `package com.triphandy.app

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.widget.RemoteViews

class ActiveTripOverviewWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("HomeWidgetPreferences", Context.MODE_PRIVATE)
        val prefsData = context.getSharedPreferences("DATA", Context.MODE_PRIVATE)

        for (appWidgetId in appWidgetIds) {
            val destination = prefs.getString("trip_destination", null) ?: prefsData.getString("trip_destination", "No Active Trip")
            val daysLeft = prefs.getString("trip_days_left", null) ?: prefsData.getString("trip_days_left", "Plan a trip")
            val dateRange = prefs.getString("trip_date_range", null) ?: prefsData.getString("trip_date_range", "")
            val rate = prefs.getString("trip_exchange_rate", null) ?: prefsData.getString("trip_exchange_rate", "")

            val views = RemoteViews(context.packageName, R.layout.active_trip_overview_widget).apply {
                setTextViewText(R.id.trip_destination, destination)
                setTextViewText(R.id.trip_days_left, daysLeft)
                setTextViewText(R.id.trip_date_range, dateRange)
                setTextViewText(R.id.trip_exchange_rate, rate)
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

class QuickLocalInfoWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("HomeWidgetPreferences", Context.MODE_PRIVATE)
        val prefsData = context.getSharedPreferences("DATA", Context.MODE_PRIVATE)

        for (appWidgetId in appWidgetIds) {
            val country = prefs.getString("local_country", null) ?: prefsData.getString("local_country", "France")
            val flagCode = prefs.getString("trip_flag", null) ?: prefsData.getString("trip_flag", "🌍")
            val police = prefs.getString("emerg_police", null) ?: prefsData.getString("emerg_police", "17")
            val ambulance = prefs.getString("emerg_ambulance", null) ?: prefsData.getString("emerg_ambulance", "15")
            val fire = prefs.getString("emerg_fire", null) ?: prefsData.getString("emerg_fire", "18")
            val general = prefs.getString("emerg_general", null) ?: prefsData.getString("emerg_general", "112")
            val holiday = prefs.getString("upcoming_holiday", null) ?: prefsData.getString("upcoming_holiday", "No upcoming holidays")

            val views = RemoteViews(context.packageName, R.layout.quick_local_info_widget).apply {
                setTextViewText(R.id.local_country, country)
                setTextViewText(R.id.trip_flag, flagCode)
                setTextViewText(R.id.emerg_police, police)
                setTextViewText(R.id.emerg_ambulance, ambulance)
                setTextViewText(R.id.emerg_fire, fire)
                setTextViewText(R.id.emerg_general, general)
                setTextViewText(R.id.upcoming_holiday, holiday)
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

class BudgetWidget : AppWidgetProvider() {
    override fun onUpdate(context: Context, appWidgetManager: AppWidgetManager, appWidgetIds: IntArray) {
        val prefs = context.getSharedPreferences("HomeWidgetPreferences", Context.MODE_PRIVATE)
        val prefsData = context.getSharedPreferences("DATA", Context.MODE_PRIVATE)

        for (appWidgetId in appWidgetIds) {
            val spent = prefs.getString("budget_spent", null) ?: prefsData.getString("budget_spent", "€0 spent")
            val remaining = prefs.getString("budget_remaining", null) ?: prefsData.getString("budget_remaining", "€0 remaining")

            val exp1Name = prefs.getString("expense_1_name", "") ?: ""
            val exp1Date = prefs.getString("expense_1_date", "") ?: ""
            val exp1Amount = prefs.getString("expense_1_amount", "") ?: ""
            val line1 = if (exp1Name.isNotEmpty()) "$exp1Name  [$exp1Date]  $exp1Amount" else ""

            val exp2Name = prefs.getString("expense_2_name", "") ?: ""
            val exp2Date = prefs.getString("expense_2_date", "") ?: ""
            val exp2Amount = prefs.getString("expense_2_amount", "") ?: ""
            val line2 = if (exp2Name.isNotEmpty()) "$exp2Name  [$exp2Date]  $exp2Amount" else ""

            val exp3Name = prefs.getString("expense_3_name", "") ?: ""
            val exp3Date = prefs.getString("expense_3_date", "") ?: ""
            val exp3Amount = prefs.getString("expense_3_amount", "") ?: ""
            val line3 = if (exp3Name.isNotEmpty()) "$exp3Name  [$exp3Date]  $exp3Amount" else ""

            val views = RemoteViews(context.packageName, R.layout.budget_widget).apply {
                setTextViewText(R.id.budget_spent, spent)
                setTextViewText(R.id.budget_remaining, remaining)

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
      const homeWidgetModuleDir = path.join(projectRoot, 'android', 'app', 'src', 'main', 'java', 'com', 'reactnativehomewidget');

      const xmlDir = path.join(resDir, 'xml');
      const layoutDir = path.join(resDir, 'layout');
      const drawableDir = path.join(resDir, 'drawable');

      fs.mkdirSync(xmlDir, { recursive: true });
      fs.mkdirSync(layoutDir, { recursive: true });
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.mkdirSync(javaDir, { recursive: true });
      fs.mkdirSync(homeWidgetModuleDir, { recursive: true });

      // Write xml info files
      fs.writeFileSync(path.join(xmlDir, 'active_trip_overview_widget_info.xml'), ACTIVE_TRIP_XML_INFO);
      fs.writeFileSync(path.join(xmlDir, 'quick_local_info_widget_info.xml'), LOCAL_INFO_XML_INFO);
      fs.writeFileSync(path.join(xmlDir, 'budget_widget_info.xml'), BUDGET_XML_INFO);

      // Write layout files
      fs.writeFileSync(path.join(layoutDir, 'active_trip_overview_widget.xml'), ACTIVE_TRIP_LAYOUT);
      fs.writeFileSync(path.join(layoutDir, 'quick_local_info_widget.xml'), LOCAL_INFO_LAYOUT);
      fs.writeFileSync(path.join(layoutDir, 'budget_widget.xml'), BUDGET_LAYOUT);
      
      // Write drawable files
      const pillRed = `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <corners android:radius="16dp" />\n    <solid android:color="#33EF4444" />\n</shape>`;
      const pillBlue = `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <corners android:radius="16dp" />\n    <solid android:color="#333B82F6" />\n</shape>`;
      const pillOrange = `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <corners android:radius="16dp" />\n    <solid android:color="#33F59E0B" />\n</shape>`;
      const pillGreen = `<?xml version="1.0" encoding="utf-8"?>\n<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">\n    <corners android:radius="16dp" />\n    <solid android:color="#3310B981" />\n</shape>`;
      
      const icPolice = `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="16dp" android:height="16dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:fillColor="#EF4444" android:pathData="M12,1L3,5v6c0,5.55 3.84,10.74 9,12c5.16,-1.26 9,-6.45 9,-12V5l-9,-4zM12,10.99h7c-0.53,4.12 -3.28,7.79 -7,8.94V12H5V6.3l7,-3.11v7.8z"/>\n</vector>`;
      const icAmbulance = `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="16dp" android:height="16dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:fillColor="#3B82F6" android:pathData="M19,3H5C3.9,3 3,3.9 3,5v14c0,1.1 0.9,2 2,2h14c1.1,0 2,-0.9 2,-2V5C21,3.9 20.1,3 19,3zM17,13h-4v4h-2v-4H7v-2h4V7h2v4h4V13z"/>\n</vector>`;
      const icFire = `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="16dp" android:height="16dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:fillColor="#F59E0B" android:pathData="M12,2c0,0 -4,4 -4,9c0,2.21 1.79,4 4,4s4,-1.79 4,-4c0,-5 -4,-9 -4,-9zM12,13c-1.1,0 -2,-0.9 -2,-2c0,-1.5 2,-4 2,-4s2,2.5 2,4c0,1.1 -0.9,2 -2,2z M12,22c-5.52,0 -10,-4.48 -10,-10h2c0,4.41 3.59,8 8,8s8,-3.59 8,-8h2c0,5.52 -4.48,10 -10,10z"/>\n</vector>`;
      const icGeneral = `<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="16dp" android:height="16dp" android:viewportWidth="24" android:viewportHeight="24">\n  <path android:fillColor="#10B981" android:pathData="M6.62,10.79c1.44,2.83 3.76,5.14 6.59,6.59l2.2,-2.2c0.27,-0.27 0.67,-0.36 1.02,-0.24c1.12,0.37 2.33,0.57 3.57,0.57c0.55,0 1,0.45 1,1V20c0,0.55 -0.45,1 -1,1c-9.39,0 -17,-7.61 -17,-17c0,-0.55 0.45,-1 1,-1h3.5c0.55,0 1,0.45 1,1c0,1.25 0.2,2.45 0.57,3.57c0.11,0.35 0.03,0.74 -0.25,1.02l-2.2,2.2z"/>\n</vector>`;
      
      fs.writeFileSync(path.join(drawableDir, 'pill_red.xml'), pillRed);
      fs.writeFileSync(path.join(drawableDir, 'pill_blue.xml'), pillBlue);
      fs.writeFileSync(path.join(drawableDir, 'pill_orange.xml'), pillOrange);
      fs.writeFileSync(path.join(drawableDir, 'pill_green.xml'), pillGreen);
      
      fs.writeFileSync(path.join(drawableDir, 'ic_police.xml'), icPolice);
      fs.writeFileSync(path.join(drawableDir, 'ic_ambulance.xml'), icAmbulance);
      fs.writeFileSync(path.join(drawableDir, 'ic_fire.xml'), icFire);
      fs.writeFileSync(path.join(drawableDir, 'ic_general.xml'), icGeneral);

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
