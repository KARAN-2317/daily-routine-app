import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";

// ---------------- NOTIFICATION SETUP ----------------

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ---------------- TYPES ----------------

type Task = {
  id: string;
  title: string;
  time: string;
  completed: boolean;
  notificationId?: string;
};

// ---------------- DEFAULT TASKS ----------------

const defaultTasks: Task[] = [
  {
    id: "1",
    title: "Morning Exercise",
    time: "07:00",
    completed: false,
  },
  {
    id: "2",
    title: "Study / College Work",
    time: "10:00",
    completed: false,
  },
  {
    id: "3",
    title: "Revision",
    time: "18:00",
    completed: false,
  },
];

const STORAGE_KEY = "@daily_routine_tasks";

// ---------------- APP ----------------

export default function Index() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskName, setTaskName] = useState("");

  const [selectedTime, setSelectedTime] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [showAbout, setShowAbout] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // ---------------- LOAD TASKS ----------------

  useEffect(() => {
    loadTasks();
    setupNotifications();
  }, []);

  useEffect(() => {
    if (loaded) {
      saveTasks(tasks);
    }
  }, [tasks, loaded]);

  const loadTasks = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);

      if (saved) {
        setTasks(JSON.parse(saved));
      } else {
        setTasks(defaultTasks);
      }
    } catch (error) {
      console.log("Error loading tasks:", error);
      setTasks(defaultTasks);
    } finally {
      setLoaded(true);
    }
  };

  const saveTasks = async (updatedTasks: Task[]) => {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updatedTasks)
      );
    } catch (error) {
      console.log("Error saving tasks:", error);
    }
  };

  // ---------------- NOTIFICATIONS ----------------

  const setupNotifications = async () => {
    try {
      const { status } =
        await Notifications.requestPermissionsAsync();

      if (status !== "granted") {
        console.log("Notification permission not granted");
        return;
      }

      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync(
          "daily-routine",
          {
            name: "Daily Routine",
            importance: Notifications.AndroidImportance.HIGH,
          }
        );
      }
    } catch (error) {
      console.log("Notification setup error:", error);
    }
  };

  const scheduleReminder = async (
    title: string,
    time: string
  ) => {
    try {
      const [hour, minute] = time.split(":").map(Number);

      const notificationId =
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Daily Routine",
            body: `Time for: ${title}`,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
          },
        });

      return notificationId;
    } catch (error) {
      console.log("Notification scheduling error:", error);
      return undefined;
    }
  };

  // ---------------- TIME ----------------

  const formatTime = (time: string) => {
    const [hourString, minute] = time.split(":");

    let hour = Number(hourString);
    const ampm = hour >= 12 ? "PM" : "AM";

    hour = hour % 12 || 12;

    return `${hour}:${minute} ${ampm}`;
  };

  const getSelectedTimeString = () => {
    const hour = selectedTime.getHours();
    const minute = selectedTime.getMinutes();

    return `${String(hour).padStart(2, "0")}:${String(
      minute
    ).padStart(2, "0")}`;
  };

  const handleTimeChange = (
    event: any,
    date?: Date
  ) => {
    setShowTimePicker(false);

    if (date) {
      setSelectedTime(date);
    }
  };

  // ---------------- ADD TASK ----------------

  const addTask = async () => {
    const cleanName = taskName.trim();

    if (!cleanName) {
      Alert.alert(
        "Task Required",
        "Please enter a task name."
      );
      return;
    }

    const time = getSelectedTimeString();

    const notificationId = await scheduleReminder(
      cleanName,
      time
    );

    const newTask: Task = {
      id: Date.now().toString(),
      title: cleanName,
      time,
      completed: false,
      notificationId,
    };

    setTasks((previous) => [
      ...previous,
      newTask,
    ]);

    setTaskName("");

    Alert.alert(
      "Task Added",
      `${cleanName} has been added to your routine.`
    );
  };

  // ---------------- COMPLETE TASK ----------------

  const toggleTask = (id: string) => {
    setTasks((previous) =>
      previous.map((task) =>
        task.id === id
          ? {
              ...task,
              completed: !task.completed,
            }
          : task
      )
    );
  };

  // ---------------- DELETE TASK ----------------

  const deleteTask = async (task: Task) => {
    try {
      if (task.notificationId) {
        await Notifications.cancelScheduledNotificationAsync(
          task.notificationId
        );
      }
    } catch (error) {
      console.log("Notification cancel error:", error);
    }

    setTasks((previous) =>
      previous.filter((item) => item.id !== task.id)
    );
  };

  // ---------------- RESET ----------------

  const resetTasks = () => {
    Alert.alert(
      "Reset Tasks",
      "Do you want to reset all tasks?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await Notifications.cancelAllScheduledNotificationsAsync();
            } catch (error) {
              console.log(error);
            }

            setTasks(defaultTasks);
          },
        },
      ]
    );
  };

  // ---------------- PROGRESS ----------------

  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const remainingTasks =
    totalTasks - completedTasks;

  const progress =
    totalTasks === 0
      ? 0
      : Math.round(
          (completedTasks / totalTasks) * 100
        );

  // ---------------- STREAK ----------------

  const getStreak = () => {
    if (tasks.length === 0) return 0;

    const allCompleted = tasks.every(
      (task) => task.completed
    );

    return allCompleted ? 1 : 0;
  };

  const streak = getStreak();

  // ---------------- TASK ITEM ----------------

  const renderTask = ({
    item,
  }: {
    item: Task;
  }) => (
    <View
      style={[
        styles.taskCard,
        item.completed && styles.completedTaskCard,
      ]}
    >
      <Pressable
        style={[
          styles.checkbox,
          item.completed && styles.checkedBox,
        ]}
        onPress={() => toggleTask(item.id)}
      >
        {item.completed && (
          <Text style={styles.checkMark}>✓</Text>
        )}
      </Pressable>

      <Pressable
        style={styles.taskMiddle}
        onPress={() => toggleTask(item.id)}
      >
        <Text
          numberOfLines={2}
          style={[
            styles.taskTitle,
            item.completed && styles.completedText,
          ]}
        >
          {item.title}
        </Text>

        <Text style={styles.taskTime}>
          {formatTime(item.time)}
        </Text>
      </Pressable>

      <Pressable
        style={styles.deleteButton}
        onPress={() => deleteTask(item)}
      >
        <Text style={styles.deleteText}>
          Delete
        </Text>
      </Pressable>
    </View>
  );

  // ---------------- UI ----------------

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#F4F7FC"
      />

      <KeyboardAvoidingView
        style={styles.container}
        behavior={
          Platform.OS === "ios"
            ? "padding"
            : undefined
        }
      >
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={
            styles.scrollContent
          }
          ListHeaderComponent={
            <>
              {/* HEADER */}

              <View style={styles.header}>
                <View style={styles.headerTextArea}>
                  <Text style={styles.appTitle}>
                    Daily Routine
                  </Text>

                  <Text style={styles.subtitle}>
                    Plan your day. Stay consistent.
                  </Text>

                  <Text style={styles.createdBy}>
                    Created by Karan Dev
                  </Text>
                </View>

                <Pressable
                  style={styles.aboutButton}
                  onPress={() =>
                    setShowAbout(true)
                  }
                >
                  <Text
                    style={styles.aboutButtonText}
                  >
                    About
                  </Text>
                </Pressable>
              </View>

              {/* ADD TASK */}

              <View style={styles.addCard}>
                <Text style={styles.sectionTitle}>
                  Add New Task
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="Enter task name"
                  placeholderTextColor="#8B9AB4"
                  value={taskName}
                  onChangeText={setTaskName}
                />

                <Pressable
                  style={styles.timeButton}
                  onPress={() =>
                    setShowTimePicker(true)
                  }
                >
                  <Text style={styles.timeButtonText}>
                    Select Time
                  </Text>

                  <Text
                    style={styles.selectedTimeText}
                  >
                    {formatTime(
                      getSelectedTimeString()
                    )}
                  </Text>
                </Pressable>

                {showTimePicker && (
                  <DateTimePicker
                    value={selectedTime}
                    mode="time"
                    display="spinner"
                    onChange={handleTimeChange}
                  />
                )}

                <Pressable
                  style={styles.addButton}
                  onPress={addTask}
                >
                  <Text style={styles.addButtonText}>
                    + Add Task
                  </Text>
                </Pressable>
              </View>

              {/* PROGRESS */}

              <View style={styles.progressCard}>
                <View style={styles.progressTop}>
                  <Text style={styles.progressTitle}>
                    Today's Progress
                  </Text>

                  <Text style={styles.progressPercent}>
                    {progress}%
                  </Text>
                </View>

                <View style={styles.progressBackground}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                      },
                    ]}
                  />
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>
                      {totalTasks}
                    </Text>
                    <Text style={styles.statLabel}>
                      Total
                    </Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <Text
                      style={[
                        styles.statNumber,
                        styles.completedNumber,
                      ]}
                    >
                      {completedTasks}
                    </Text>

                    <Text style={styles.statLabel}>
                      Completed
                    </Text>
                  </View>

                  <View style={styles.statDivider} />

                  <View style={styles.statItem}>
                    <Text
                      style={[
                        styles.statNumber,
                        styles.remainingNumber,
                      ]}
                    >
                      {remainingTasks}
                    </Text>

                    <Text style={styles.statLabel}>
                      Remaining
                    </Text>
                  </View>
                </View>
              </View>

              {/* STREAK */}

              <View style={styles.streakCard}>
                <Text style={styles.streakTitle}>
                  Current Streak
                </Text>

                <Text style={styles.streakNumber}>
                  {streak} day
                </Text>

                <Text style={styles.streakSubtitle}>
                  Keep completing your daily tasks.
                </Text>
              </View>

              {/* TASK HEADER */}

              <View style={styles.tasksHeader}>
                <Text style={styles.tasksTitle}>
                  Today's Tasks
                </Text>

                <Pressable
                  onPress={resetTasks}
                  style={styles.resetButton}
                >
                  <Text style={styles.resetText}>
                    Reset
                  </Text>
                </Pressable>
              </View>
            </>
          }
          ListFooterComponent={
            <>
              {/* FOOTER */}

              <View style={styles.footer}>
                <Text style={styles.footerHeading}>
                  Small progress every day leads to
                  big results.
                </Text>

                <Text style={styles.footerDescription}>
                  Daily Routine is a student project
                  created by Karan Dev to manage
                  everyday tasks, study time and
                  personal goals.
                </Text>

                <View style={styles.footerLine} />

                <Text style={styles.footerCredits}>
                  Made with React Native & Expo
                </Text>

                <Text style={styles.footerDeveloper}>
                  Karan Dev • Student Project
                </Text>

                <Text style={styles.footerTagline}>
                  Stay consistent. Keep moving forward.
                </Text>
              </View>

              <View style={styles.bottomSpace} />
            </>
          }
        />

        {/* ABOUT MODAL */}

        <Modal
          visible={showAbout}
          transparent
          animationType="slide"
          onRequestClose={() =>
            setShowAbout(false)
          }
        >
          <View style={styles.modalOverlay}>
            <View style={styles.aboutModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  About Daily Routine
                </Text>

                <Pressable
                  onPress={() =>
                    setShowAbout(false)
                  }
                >
                  <Text style={styles.closeButton}>
                    ✕
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
              >
                <Text style={styles.aboutDescription}>
                  Daily Routine is a simple student
                  productivity app designed to help
                  manage everyday tasks, study time
                  and personal goals.
                </Text>

                <Text style={styles.aboutHeading}>
                  How it works
                </Text>

                <Text style={styles.aboutText}>
                  • Add your daily tasks{"\n"}
                  • Select a specific time{"\n"}
                  • Receive daily reminders{"\n"}
                  • Mark tasks as completed{"\n"}
                  • Track your daily progress{"\n"}
                  • Maintain your routine streak{"\n"}
                  • Tasks are saved automatically
                </Text>

                <Text style={styles.aboutHeading}>
                  Project Information
                </Text>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    App Name
                  </Text>
                  <Text style={styles.infoValue}>
                    Daily Routine
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Developed By
                  </Text>
                  <Text style={styles.infoValue}>
                    Karan Dev
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Technology
                  </Text>
                  <Text style={styles.infoValue}>
                    React Native + Expo
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Project Type
                  </Text>
                  <Text style={styles.infoValue}>
                    Student Project
                  </Text>
                </View>

                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>
                    Version
                  </Text>
                  <Text style={styles.infoValue}>
                    1.0.0
                  </Text>
                </View>

                <Text style={styles.modalFooter}>
                  Built with consistency and small
                  daily progress.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------- STYLES ----------------

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },

  container: {
    flex: 1,
    backgroundColor: "#F4F7FC",
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // HEADER

  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  headerTextArea: {
    flex: 1,
    paddingRight: 12,
  },

  appTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#14284A",
    marginBottom: 4,
  },

  subtitle: {
    fontSize: 15,
    color: "#647796",
    marginBottom: 6,
  },

  createdBy: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2876E8",
  },

  aboutButton: {
    borderWidth: 1,
    borderColor: "#8EB6FF",
    borderRadius: 24,
    paddingHorizontal: 17,
    paddingVertical: 10,
    marginTop: 4,
  },

  aboutButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2876E8",
  },

  // ADD CARD

  addCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    shadowColor: "#5A6B85",
    shadowOffset: {
      width: 0,
      height: 5,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },

  sectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#14284A",
    marginBottom: 16,
  },

  input: {
    height: 58,
    borderWidth: 1,
    borderColor: "#D8E1EF",
    borderRadius: 15,
    paddingHorizontal: 17,
    fontSize: 16,
    color: "#172B4D",
    backgroundColor: "#FBFCFF",
    marginBottom: 12,
  },

  timeButton: {
    height: 58,
    borderWidth: 1,
    borderColor: "#D8E1EF",
    borderRadius: 15,
    paddingHorizontal: 17,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FBFCFF",
    marginBottom: 14,
  },

  timeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#516A8D",
  },

  selectedTimeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#172B4D",
  },

  addButton: {
    height: 56,
    borderRadius: 15,
    backgroundColor: "#3478EA",
    alignItems: "center",
    justifyContent: "center",
  },

  addButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },

  // PROGRESS

  progressCard: {
    backgroundColor: "#EEF5FF",
    borderRadius: 22,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#DDEAFF",
  },

  progressTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  progressTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#142E63",
  },

  progressPercent: {
    fontSize: 22,
    fontWeight: "800",
    color: "#2876E8",
  },

  progressBackground: {
    height: 10,
    backgroundColor: "#D7E3F5",
    borderRadius: 10,
    overflow: "hidden",
    marginBottom: 20,
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#3478EA",
    borderRadius: 10,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statNumber: {
    fontSize: 24,
    fontWeight: "800",
    color: "#14284A",
  },

  completedNumber: {
    color: "#24945A",
  },

  remainingNumber: {
    color: "#D99218",
  },

  statLabel: {
    fontSize: 14,
    color: "#657A9B",
    marginTop: 3,
  },

  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: "#D1DDED",
  },

  // STREAK

  streakCard: {
    backgroundColor: "#EFFAF4",
    borderRadius: 22,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D7F0E1",
  },

  streakTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#183A2A",
  },

  streakNumber: {
    fontSize: 27,
    fontWeight: "800",
    color: "#27965C",
    marginTop: 5,
  },

  streakSubtitle: {
    fontSize: 14,
    color: "#648071",
    marginTop: 3,
  },

  // TASK HEADER

  tasksHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  tasksTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#14284A",
  },

  resetButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: "#FFF2F2",
    borderWidth: 1,
    borderColor: "#FFD6D6",
  },

  resetText: {
    color: "#E54848",
    fontSize: 14,
    fontWeight: "700",
  },

  // TASK CARD

  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    minHeight: 82,
    borderWidth: 1,
    borderColor: "#EDF1F7",
  },

  completedTaskCard: {
    backgroundColor: "#F5F9FF",
    borderColor: "#DCE9FF",
  },

  checkbox: {
    width: 40,
    height: 40,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: "#BAC7D9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },

  checkedBox: {
    backgroundColor: "#3478EA",
    borderColor: "#3478EA",
  },

  checkMark: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  taskMiddle: {
    flex: 1,
    minWidth: 0,
  },

  taskTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#14284A",
    marginBottom: 4,
  },

  completedText: {
    color: "#71809A",
    textDecorationLine: "line-through",
  },

  taskTime: {
    fontSize: 14,
    color: "#7184A2",
    fontWeight: "600",
  },

  deleteButton: {
    paddingLeft: 10,
    paddingVertical: 10,
  },

  deleteText: {
    color: "#E54848",
    fontSize: 14,
    fontWeight: "700",
  },

  // FOOTER

  footer: {
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 30,
    paddingBottom: 15,
  },

  footerHeading: {
    fontSize: 17,
    fontWeight: "800",
    color: "#14284A",
    textAlign: "center",
    marginBottom: 10,
  },

  footerDescription: {
    fontSize: 14,
    lineHeight: 21,
    color: "#667995",
    textAlign: "center",
    maxWidth: 360,
  },

  footerLine: {
    width: "70%",
    height: 1,
    backgroundColor: "#D8E1EF",
    marginVertical: 17,
  },

  footerCredits: {
    fontSize: 13,
    fontWeight: "600",
    color: "#526A8E",
    textAlign: "center",
  },

  footerDeveloper: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2876E8",
    marginTop: 5,
    textAlign: "center",
  },

  footerTagline: {
    fontSize: 13,
    color: "#8190A8",
    marginTop: 12,
    textAlign: "center",
  },

  bottomSpace: {
    height: 20,
  },

  // ABOUT MODAL

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 30, 55, 0.35)",
    justifyContent: "flex-end",
  },

  aboutModal: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 30,
    maxHeight: "88%",
  },

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  modalTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: "800",
    color: "#14284A",
  },

  closeButton: {
    fontSize: 22,
    color: "#647796",
    padding: 5,
  },

  aboutDescription: {
    fontSize: 15,
    lineHeight: 23,
    color: "#60738F",
    marginBottom: 22,
  },

  aboutHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#14284A",
    marginBottom: 10,
  },

  aboutText: {
    fontSize: 15,
    lineHeight: 27,
    color: "#60738F",
    marginBottom: 22,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF1F7",
  },

  infoLabel: {
    fontSize: 14,
    color: "#7A8AA3",
  },

  infoValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#263D60",
    textAlign: "right",
    marginLeft: 10,
  },

  modalFooter: {
    textAlign: "center",
    fontSize: 13,
    color: "#8190A8",
    marginTop: 24,
    lineHeight: 20,
  },
});