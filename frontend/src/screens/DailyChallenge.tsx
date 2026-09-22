import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";

type Props = {
    onComplete: (score: number) => void;
    onBack: () => void;
};

type Question = {
    a: number;
    b: number;
    operator: "+" | "-";
    answer: number;
};

const DURATION_SECONDS = 120;

function createQuestion(): Question {
    const operator: "+" | "-" = Math.random() < 0.5 ? "+" : "-";

    let a = Math.floor(Math.random() * 50) + 1;
    let b = Math.floor(Math.random() * 50) + 1;

    // Keep subtraction answers non-negative.
    if (operator === "-" && b > a) {
        [a, b] = [b, a];
    }

    return {
        a,
        b,
        operator,
        answer: operator === "+" ? a + b : a - b,
    };
}

function createOptions(answer: number): number[] {
    const values = new Set<number>([answer]);

    while (values.size < 4) {
        const offset = Math.floor(Math.random() * 11) - 5;

        if (offset !== 0) {
            values.add(Math.max(0, answer + offset));
        }
    }

    return Array.from(values).sort(() => Math.random() - 0.5);
}

export default function DailyChallenge({
    onComplete,
    onBack,
}: Props) {
    const [question, setQuestion] = useState<Question>(() => createQuestion());
    const [options, setOptions] = useState<number[]>([]);
    const [score, setScore] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(DURATION_SECONDS);
    const [finished, setFinished] = useState(false);

    useEffect(() => {
        setOptions(createOptions(question.answer));
    }, [question]);

    useEffect(() => {
        if (finished) {
            return;
        }

        if (secondsLeft <= 0) {
            setFinished(true);
            onComplete(score);
            return;
        }

        const timer = setInterval(() => {
            setSecondsLeft((current) => Math.max(0, current - 1));
        }, 1000);

        return () => clearInterval(timer);
    }, [finished, secondsLeft, score, onComplete]);

    const timerText = useMemo(() => {
        const minutes = Math.floor(secondsLeft / 60);
        const seconds = secondsLeft % 60;

        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    }, [secondsLeft]);

    const answerQuestion = (answer: number) => {
        if (finished) {
            return;
        }

        if (answer === question.answer) {
            const nextScore = score + 1;
            setScore(nextScore);

            Haptics.impactAsync(
                Haptics.ImpactFeedbackStyle.Light
            ).catch(() => { });

            setQuestion(createQuestion());
        } else {
            Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Error
            ).catch(() => { });
        }
    };

    if (finished) {
        return (
            <View style={styles.container}>
                <View style={styles.resultCard}>
                    <Text style={styles.eyebrow}>DAILY CHALLENGE</Text>

                    <Text style={styles.resultTitle}>Challenge Complete!</Text>

                    <Text style={styles.resultScore}>{score}</Text>

                    <Text style={styles.resultLabel}>
                        correct answers
                    </Text>

                    <Text style={styles.reward}>
                        +5 Tokens
                    </Text>

                    <Pressable
                        style={styles.primaryButton}
                        onPress={onBack}
                    >
                        <Text style={styles.primaryButtonText}>
                            Continue
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={onBack}>
                    <Text style={styles.backText}>‹ Back</Text>
                </Pressable>

                <Text style={styles.headerTitle}>Daily Challenge</Text>

                <View style={styles.timer}>
                    <Text style={styles.timerText}>{timerText}</Text>
                </View>
            </View>

            <View style={styles.content}>
                <Text style={styles.eyebrow}>TODAY'S CHALLENGE</Text>

                <Text style={styles.instruction}>
                    Solve as many as you can in 2 minutes.
                </Text>

                <View style={styles.scoreCard}>
                    <Text style={styles.scoreLabel}>SCORE</Text>
                    <Text style={styles.score}>{score}</Text>
                </View>

                <View style={styles.questionCard}>
                    <Text style={styles.question}>
                        {question.a} {question.operator} {question.b} = ?
                    </Text>
                </View>

                <View style={styles.options}>
                    {options.map((option) => (
                        <Pressable
                            key={option}
                            style={styles.option}
                            onPress={() => answerQuestion(option)}
                        >
                            <Text style={styles.optionText}>{option}</Text>
                        </Pressable>
                    ))}
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "transparent",
        paddingHorizontal: 20,
        paddingTop: 48,
    },

    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },

    backText: {
        fontSize: 17,
        fontWeight: "700",
        color: "#34405A",
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: "900",
        color: "#17213A",
    },

    timer: {
        minWidth: 72,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 14,
        backgroundColor: "#17213A",
        alignItems: "center",
    },

    timerText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
    },

    content: {
        flex: 1,
        alignItems: "center",
        paddingTop: 38,
    },

    eyebrow: {
        fontSize: 12,
        fontWeight: "900",
        letterSpacing: 1.5,
        color: "#66708A",
    },

    instruction: {
        marginTop: 8,
        textAlign: "center",
        color: "#68738C",
        fontSize: 15,
    },

    scoreCard: {
        marginTop: 22,
        alignItems: "center",
    },

    scoreLabel: {
        fontSize: 11,
        fontWeight: "900",
        color: "#7A849B",
        letterSpacing: 1,
    },

    score: {
        marginTop: 2,
        fontSize: 38,
        fontWeight: "900",
        color: "#17213A",
    },

    questionCard: {
        width: "100%",
        marginTop: 28,
        paddingVertical: 36,
        paddingHorizontal: 18,
        borderRadius: 28,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        shadowColor: "#17213A",
        shadowOpacity: 0.08,
        shadowRadius: 18,
        shadowOffset: {
            width: 0,
            height: 8,
        },
        elevation: 4,
    },

    question: {
        fontSize: 38,
        fontWeight: "900",
        color: "#17213A",
    },

    options: {
        width: "100%",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        marginTop: 20,
        gap: 12,
    },

    option: {
        width: "48%",
        minHeight: 64,
        borderRadius: 20,
        backgroundColor: "#FFFFFF",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#DCE3F1",
    },

    optionText: {
        fontSize: 24,
        fontWeight: "900",
        color: "#25304A",
    },

    resultCard: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },

    resultTitle: {
        marginTop: 12,
        fontSize: 28,
        fontWeight: "900",
        color: "#17213A",
        textAlign: "center",
    },

    resultScore: {
        marginTop: 28,
        fontSize: 72,
        fontWeight: "900",
        color: "#17213A",
    },

    resultLabel: {
        fontSize: 16,
        color: "#68738C",
    },

    reward: {
        marginTop: 18,
        fontSize: 20,
        fontWeight: "900",
        color: "#D18A00",
    },

    primaryButton: {
        marginTop: 36,
        minWidth: 180,
        paddingVertical: 15,
        paddingHorizontal: 28,
        borderRadius: 18,
        backgroundColor: "#17213A",
        alignItems: "center",
    },

    primaryButtonText: {
        color: "#FFFFFF",
        fontSize: 17,
        fontWeight: "900",
    },
});