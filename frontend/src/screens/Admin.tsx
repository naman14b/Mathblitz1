import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState, useEffect } from "react";
import { ActivityIndicator, Alert, Image, Linking, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { AGE_GROUPS } from "@/src/game/types";
import { adminApi, fileUrl } from "@/src/api/admin";
import { AdminQuestion, ChallengeQuestion, ChallengeTier, MonetizationSettings } from "@/src/api/types";
import { IconButton, PrimaryButton, ScreenTitle, SoftButton } from "@/src/components/ui";
import { makeStyles, useTheme } from "@/src/theme";

type AuthStage = "otp" | "password" | "login";
type AdminTab = "questions" | "challenges" | "monetization";
const ADMIN_EMAIL = "naman14b@gmail.com";
const blankQuestion = (): AdminQuestion => ({ id: `q-${Date.now()}`, prompt: "", options: ["", "", "", ""], correct_answer: "", age_group: "6-7", topic: "addition", active: true });
const blankChallenge = (tier: ChallengeTier): ChallengeQuestion => ({ id: `c-${Date.now()}`, tier, prompt: "", image_path: null, options: ["", "", "", ""], correct_answer: "", time_limit_seconds: 15, active: true });

export function Admin({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const styles = useStyles();
  const [token, setToken] = useState<string | null>("bypassed_admin_token");
  const [stage, setStage] = useState<AuthStage>("otp");
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [otp, setOtp] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<AdminTab>("questions");
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [challengeQuestions, setChallengeQuestions] = useState<ChallengeQuestion[]>([]);
  const [monetization, setMonetization] = useState<MonetizationSettings>({ rewarded_ads_enabled: false, interstitial_frequency: 0, remove_ads_price: "" });
  const [draft, setDraft] = useState<AdminQuestion | null>(null);

  const load = async (session: string) => {
    try {
      const [qs, cs, money] = await Promise.all([adminApi.questions(session), adminApi.challengeQuestions(session), adminApi.monetization(session)]);
      setQuestions(qs); setChallengeQuestions(cs); setMonetization(money);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not load admin data"); }
  };

  useEffect(() => {
    load("bypassed_admin_token");
  }, []);
  const sendOtp = async () => {
    setError(""); setNotice("");
    try { await adminApi.requestOtp(email); setStage("otp"); setNotice("Verification code sent. Check your Gmail inbox."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send the verification code"); }
  };
  const verifyOtp = async () => {
    setError("");
    try { const result = await adminApi.verifyOtp(email, otp); setSetupToken(result.setup_token); setStage("password"); setNotice("Email verified. Create your new admin password."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid or expired code"); }
  };
  const finishPassword = async () => {
    setNotice("");
    if (!newPassword || !confirmPassword) { setError("Enter and confirm your new password"); return; }
    if (newPassword.length < 12) { setError(`Password needs at least 12 characters (you have ${newPassword.length})`); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match"); return; }
    if (!setupToken) { setError("Verification expired. Send a new code and try again."); setStage("otp"); setOtp(""); return; }
    setError("");
    try { const result = await adminApi.setPassword(setupToken, newPassword); setToken(result.token); await load(result.token); }
    catch (cause) {
      const message = cause instanceof Error ? cause.message : "Could not save password";
      if (/setup session|expired/i.test(message)) {
        setSetupToken(""); setStage("otp"); setOtp(""); setNewPassword(""); setConfirmPassword("");
        setError("Verification expired. Send a new code and try again.");
      } else { setError(message); }
    }
  };
  const login = async () => {
    setError("");
    try { const result = await adminApi.login(email, password); setToken(result.token); await load(result.token); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Invalid credentials"); }
  };

  if (!token) return <AuthView stage={stage} email={email} setEmail={setEmail} otp={otp} setOtp={setOtp} password={password} setPassword={setPassword} newPassword={newPassword} setNewPassword={setNewPassword} confirmPassword={confirmPassword} setConfirmPassword={setConfirmPassword} error={error} notice={notice} onBack={onBack} onSendOtp={sendOtp} onVerifyOtp={verifyOtp} onFinishPassword={finishPassword} onLogin={login} onStage={setStage} />;
  return <View style={styles.root}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 15, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }}>
    <View style={styles.topbar}><IconButton name="arrow-back" label="Back" onPress={onBack} /><Text style={styles.topTitle}>Admin studio</Text><View style={styles.spacer} /></View>
    <View style={styles.adminHeader}><ScreenTitle eyebrow="Owner workspace" title="Keep the blitz fresh." subtitle="Manual controls are live and ready for your question bank." /></View>
    <View style={styles.tabs}>{(["questions", "challenges", "monetization"] as const).map((item) => <Pressable testID={`admin-tab-${item}`} key={item} onPress={() => setTab(item)} style={[styles.tab, tab === item && styles.activeTab]}><Text style={[styles.tabText, tab === item && styles.activeTabText]}>{item}</Text></Pressable>)}</View>
    {tab === "questions" ? <QuestionPanel questions={questions} draft={draft} setDraft={setDraft} onSave={async (question) => { await adminApi.saveQuestion(token, question); setQuestions(await adminApi.questions(token)); setDraft(null); }} onDelete={async (id) => { await adminApi.deleteQuestion(token, id); setQuestions(await adminApi.questions(token)); }} /> : null}
    {tab === "challenges" ? <ChallengePanel token={token} items={challengeQuestions} onChange={setChallengeQuestions} /> : null}
    {tab === "monetization" ? <MonetizationPanel settings={monetization} token={token} onChange={setMonetization} /> : null}
  </ScrollView></View>;
}

function AuthView({ stage, email, setEmail, otp, setOtp, password, setPassword, newPassword, setNewPassword, confirmPassword, setConfirmPassword, error, notice, onBack, onSendOtp, onVerifyOtp, onFinishPassword, onLogin, onStage }: { stage: AuthStage; email: string; setEmail: (value: string) => void; otp: string; setOtp: (value: string) => void; password: string; setPassword: (value: string) => void; newPassword: string; setNewPassword: (value: string) => void; confirmPassword: string; setConfirmPassword: (value: string) => void; error: string; notice: string; onBack: () => void; onSendOtp: () => void; onVerifyOtp: () => void; onFinishPassword: () => void; onLogin: () => void; onStage: (stage: AuthStage) => void }) {
  const insets = useSafeAreaInsets(); const { colors } = useTheme(); const styles = useStyles();
  return <View style={styles.root}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 15, paddingBottom: insets.bottom + 30, paddingHorizontal: 20 }}><View style={styles.topbar}><IconButton name="arrow-back" label="Back" onPress={onBack} /><Text style={styles.topTitle}>Owner access</Text><View style={styles.spacer} /></View><View style={styles.loginHeader}><View style={styles.lock}><Ionicons name={stage === "login" ? "lock-closed" : "mail"} size={23} color={colors.onBrandPrimary} /></View><ScreenTitle eyebrow={stage === "password" ? "Email verified" : "Private workspace"} title={stage === "password" ? "Create a new password" : stage === "login" ? "Password login" : "Verify your Gmail"} subtitle={stage === "password" ? "Set a password to finish securing the admin account." : stage === "login" ? "Use the password you created after verification." : "We’ll send a one-time code to your administrator inbox."} /></View><View style={styles.form}><Text style={styles.label}>ADMIN EMAIL</Text><TextInput testID="admin-email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder={ADMIN_EMAIL} placeholderTextColor={colors.muted} style={styles.input} editable={stage !== "password"} />{stage === "otp" ? <><Text style={styles.label}>ONE-TIME CODE</Text><TextInput testID="admin-otp" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} placeholder="6-digit code from Gmail" placeholderTextColor={colors.muted} style={styles.input} /><PrimaryButton testID="admin-send-otp" onPress={onSendOtp} icon="paper-plane-outline">Send verification code</PrimaryButton><PrimaryButton testID="admin-verify-otp" onPress={onVerifyOtp} icon="checkmark-circle-outline" disabled={otp.length !== 6}>Verify code</PrimaryButton><SoftButton testID="admin-use-password" onPress={() => onStage("login")} icon="key-outline">Use password login</SoftButton></> : null}{stage === "password" ? <><Text style={styles.label}>NEW PASSWORD</Text><TextInput testID="admin-new-password" secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="At least 12 characters" placeholderTextColor={colors.muted} style={styles.input} /><Text testID="admin-password-counter" style={[styles.helper, { color: newPassword.length >= 12 ? colors.success : colors.muted }]}>{newPassword.length}/12 characters</Text><Text style={styles.label}>CONFIRM PASSWORD</Text><TextInput testID="admin-confirm-password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat your new password" placeholderTextColor={colors.muted} style={styles.input} />{confirmPassword.length > 0 ? <Text testID="admin-password-match" style={[styles.helper, { color: confirmPassword === newPassword ? colors.success : colors.error }]}>{confirmPassword === newPassword ? "Passwords match" : "Passwords do not match yet"}</Text> : null}<PrimaryButton testID="admin-set-password" onPress={onFinishPassword} icon="shield-checkmark-outline">Save new password</PrimaryButton></> : null}{stage === "login" ? <><Text style={styles.label}>PASSWORD</Text><TextInput testID="admin-password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Your admin password" placeholderTextColor={colors.muted} style={styles.input} /><PrimaryButton testID="admin-sign-in" onPress={onLogin} icon="log-in-outline">Sign in</PrimaryButton><SoftButton testID="admin-use-otp" onPress={() => onStage("otp")} icon="mail-outline">Use Gmail verification</SoftButton></> : null}{error ? <Text style={styles.error}>{error}</Text> : null}{notice ? <Text style={styles.notice}>{notice}</Text> : null}<Text style={styles.note}>Codes expire in 10 minutes and can only be used once.</Text></View></ScrollView></View>;
}

function QuestionPanel({ questions, draft, setDraft, onSave, onDelete }: { questions: AdminQuestion[]; draft: AdminQuestion | null; setDraft: (draft: AdminQuestion | null) => void; onSave: (question: AdminQuestion) => Promise<void>; onDelete: (id: string) => Promise<void> }) {
  const { colors } = useTheme(); const styles = useStyles();
  return <View><View style={styles.panelHeading}><Text style={styles.panelTitle}>{questions.length} questions</Text><SoftButton testID="admin-new-question" icon="add" onPress={() => setDraft(blankQuestion())}>New question</SoftButton></View>{draft ? <View style={styles.editor}><Text style={styles.label}>QUESTION</Text><TextInput testID="admin-question-prompt" value={draft.prompt} onChangeText={(prompt) => setDraft({ ...draft, prompt })} placeholder="e.g. 8 × 7 = ?" placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.label}>OPTIONS · comma separated</Text><TextInput testID="admin-question-options" value={draft.options.join(", ")} onChangeText={(value) => setDraft({ ...draft, options: value.split(",").map((item) => item.trim()) })} style={styles.input} placeholder="54, 56, 58, 60" placeholderTextColor={colors.muted} /><Text style={styles.label}>CORRECT ANSWER</Text><TextInput testID="admin-question-answer" value={draft.correct_answer} onChangeText={(correct_answer) => setDraft({ ...draft, correct_answer })} style={styles.input} placeholder="56" placeholderTextColor={colors.muted} /><Text style={styles.label}>AGE GROUP</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{AGE_GROUPS.map((age) => <Pressable testID={`admin-age-${age.id}`} key={age.id} onPress={() => setDraft({ ...draft, age_group: age.id })} style={[styles.chip, draft.age_group === age.id && styles.chipActive]}><Text style={[styles.chipText, draft.age_group === age.id && styles.chipTextActive]}>{age.id}</Text></Pressable>)}</ScrollView><View style={styles.editorActions}><SoftButton onPress={() => setDraft(null)}>Cancel</SoftButton><PrimaryButton testID="admin-save-question" onPress={() => onSave(draft)} style={styles.save}>Save question</PrimaryButton></View></View> : null}{questions.map((question) => <View key={question.id} style={styles.listRow}><View style={styles.listCopy}><Text style={styles.listTitle}>{question.prompt || "Untitled question"}</Text><Text style={styles.listSub}>{question.age_group} · {question.topic} · answer {question.correct_answer}</Text></View><Pressable testID={`admin-delete-question-${question.id}`} accessibilityRole="button" accessibilityLabel="Delete question" onPress={() => Alert.alert("Delete question?", "This removes it from the admin bank.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => onDelete(question.id) }])}><Ionicons name="trash-outline" size={20} color={colors.error} /></Pressable></View>)}</View>;
}

function ChallengePanel({ token, items, onChange }: { token: string; items: ChallengeQuestion[]; onChange: (value: ChallengeQuestion[]) => void }) {
  const { colors } = useTheme(); const styles = useStyles();
  const [tier, setTier] = useState<ChallengeTier>("3-day");
  const [draft, setDraft] = useState<ChallengeQuestion | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const tierItems = items.filter((item) => item.tier === tier);

  const openEditor = (existing?: ChallengeQuestion) => {
    setUploadError("");
    setDraft(existing ? { ...existing, options: [...existing.options] } : blankChallenge(tier));
  };
  const closeEditor = () => { setDraft(null); setUploadError(""); };
  const pickImage = async () => {
    if (!draft) return;
    setUploadError("");
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setUploadError("Photo permission was denied. Grant it in settings to attach images.");
        if (!permission.canAskAgain) Linking.openSettings().catch(() => {});
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8, allowsEditing: false });
      if (picked.canceled || !picked.assets?.[0]) return;
      const asset = picked.assets[0];
      setUploading(true);
      const name = asset.fileName ?? `challenge-${Date.now()}.jpg`;
      const type = asset.mimeType ?? "image/jpeg";
      const uploaded = await adminApi.uploadImage(token, asset.uri, name, type);
      setDraft({ ...draft, image_path: uploaded.path });
    } catch (cause) {
      setUploadError(cause instanceof Error ? cause.message : "Image upload failed");
    } finally { setUploading(false); }
  };
  const save = async () => {
    if (!draft) return;
    setUploadError("");
    const options = draft.options.map((option) => option.trim());
    if (options.some((option) => option.length === 0)) { setUploadError("All 4 options are required"); return; }
    if (!options.includes(draft.correct_answer.trim())) { setUploadError("Correct answer must match one of the four options"); return; }
    const seconds = Number(draft.time_limit_seconds);
    if (!Number.isFinite(seconds) || seconds < 3 || seconds > 120) { setUploadError("Time limit must be between 3 and 120 seconds"); return; }
    try {
      const saved = await adminApi.saveChallengeQuestion(token, { ...draft, options, correct_answer: draft.correct_answer.trim(), time_limit_seconds: Math.round(seconds) });
      const merged = [saved, ...items.filter((item) => item.id !== saved.id)];
      onChange(merged); setDraft(null);
    } catch (cause) { setUploadError(cause instanceof Error ? cause.message : "Could not save challenge"); }
  };
  const remove = async (id: string) => {
    try { await adminApi.deleteChallengeQuestion(token, id); onChange(items.filter((item) => item.id !== id)); }
    catch (cause) { setUploadError(cause instanceof Error ? cause.message : "Could not delete"); }
  };

  const imageUri = draft?.image_path ? fileUrl(draft.image_path) : null;
  return <View>
    <Text style={styles.panelTitle}>Challenge questions</Text>
    <Text style={styles.panelSub}>These play after a 3-day or 7-day streak. Add image, four options and a time limit for each.</Text>
    <View style={styles.tierRow}>{(["3-day", "7-day"] as const).map((option) => <Pressable testID={`admin-tier-${option}`} key={option} onPress={() => setTier(option)} style={[styles.tierChip, tier === option && styles.tierChipActive]}><Text style={[styles.tierChipText, tier === option && styles.tierChipTextActive]}>{option === "3-day" ? "3-day streak" : "7-day streak"}</Text></Pressable>)}</View>
    <View style={styles.panelHeading}><Text style={styles.panelSub}>{tierItems.length} {tier} challenges</Text><SoftButton testID="admin-new-challenge" icon="add" onPress={() => openEditor()}>New challenge</SoftButton></View>
    {draft ? <View style={styles.editor}>
      <Text style={styles.label}>PROMPT (optional if image speaks for itself)</Text>
      <TextInput testID="admin-challenge-prompt" value={draft.prompt} onChangeText={(prompt) => setDraft({ ...draft, prompt })} placeholder="e.g. Solve for x" placeholderTextColor={colors.muted} style={styles.input} />
      <Text style={styles.label}>IMAGE</Text>
      <Pressable testID="admin-challenge-image" onPress={pickImage} disabled={uploading} style={styles.imagePicker}>
        {uploading ? <ActivityIndicator color={colors.brandPrimary} /> : imageUri ? <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" /> : <><Ionicons name="image-outline" size={26} color={colors.muted} /><Text style={styles.imagePickerText}>Tap to pick an image</Text></>}
      </Pressable>
      {draft.image_path ? <SoftButton testID="admin-challenge-image-clear" onPress={() => setDraft({ ...draft, image_path: null })} icon="close-circle-outline">Remove image</SoftButton> : null}
      {[0, 1, 2, 3].map((index) => <View key={index}>
        <Text style={styles.label}>OPTION {String.fromCharCode(65 + index)}</Text>
        <TextInput testID={`admin-challenge-option-${index}`} value={draft.options[index] ?? ""} onChangeText={(value) => { const next = [...draft.options]; next[index] = value; setDraft({ ...draft, options: next }); }} placeholder={`Option ${String.fromCharCode(65 + index)}`} placeholderTextColor={colors.muted} style={styles.input} />
      </View>)}
      <Text style={styles.label}>CORRECT ANSWER · pick from options</Text>
      <View style={styles.correctRow}>{draft.options.map((option, index) => option.trim() ? <Pressable key={`${option}-${index}`} testID={`admin-challenge-correct-${index}`} onPress={() => setDraft({ ...draft, correct_answer: option.trim() })} style={[styles.correctChip, draft.correct_answer === option.trim() && styles.correctChipActive]}><Text style={[styles.correctChipText, draft.correct_answer === option.trim() && styles.correctChipTextActive]}>{String.fromCharCode(65 + index)} · {option.trim()}</Text></Pressable> : null)}</View>
      <Text style={styles.label}>TIME LIMIT (SECONDS · 3–120)</Text>
      <TextInput testID="admin-challenge-time" keyboardType="number-pad" value={String(draft.time_limit_seconds)} onChangeText={(value) => setDraft({ ...draft, time_limit_seconds: Number(value) || 0 })} style={styles.input} />
      {uploadError ? <Text style={styles.error}>{uploadError}</Text> : null}
      <View style={styles.editorActions}><SoftButton onPress={closeEditor}>Cancel</SoftButton><PrimaryButton testID="admin-save-challenge" onPress={save} icon="save-outline" style={styles.save}>Save challenge</PrimaryButton></View>
    </View> : null}
    {tierItems.map((question) => {
      const uri = question.image_path ? fileUrl(question.image_path) : null;
      return <View key={question.id} style={styles.challengeCard}>
        {uri ? <Image source={{ uri }} style={styles.thumb} resizeMode="cover" /> : <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name="image-outline" size={20} color={colors.muted} /></View>}
        <View style={styles.listCopy}>
          <Text style={styles.listTitle} numberOfLines={2}>{question.prompt || "Untitled challenge"}</Text>
          <Text style={styles.listSub}>{question.time_limit_seconds}s · answer {question.correct_answer}</Text>
        </View>
        <Pressable testID={`admin-edit-challenge-${question.id}`} onPress={() => openEditor(question)} style={styles.iconBtn}><Ionicons name="create-outline" size={20} color={colors.brandPrimary} /></Pressable>
        <Pressable testID={`admin-delete-challenge-${question.id}`} accessibilityRole="button" accessibilityLabel="Delete challenge" onPress={() => Alert.alert("Delete challenge?", "This removes it from the challenge bank.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => remove(question.id) }])} style={styles.iconBtn}><Ionicons name="trash-outline" size={20} color={colors.error} /></Pressable>
      </View>;
    })}
    {tierItems.length === 0 && !draft ? <View style={styles.emptyBlock}><Ionicons name="ribbon-outline" size={28} color={colors.muted} /><Text style={styles.emptyText}>No {tier} challenges yet. Tap “New challenge” to add one.</Text></View> : null}
  </View>;
}

function MonetizationPanel({ settings, token, onChange }: { settings: MonetizationSettings; token: string; onChange: (value: MonetizationSettings) => void }) {
  const { colors } = useTheme(); const styles = useStyles(); const save = async (value: MonetizationSettings) => onChange(await adminApi.saveMonetization(token, value));
  return <View><Text style={styles.panelTitle}>Monetization settings</Text><Text style={styles.panelSub}>Keep these disabled until ad and family-policy reviews are complete.</Text><ToggleRow title="Rewarded ads" value={settings.rewarded_ads_enabled} onPress={() => save({ ...settings, rewarded_ads_enabled: !settings.rewarded_ads_enabled })} /><View style={styles.moneyCard}><Text style={styles.label}>INTERSTITIAL FREQUENCY</Text><TextInput testID="admin-interstitial-frequency" keyboardType="number-pad" value={String(settings.interstitial_frequency)} onChangeText={(value) => onChange({ ...settings, interstitial_frequency: Number(value) || 0 })} style={styles.input} /><Text style={styles.label}>REMOVE ADS PRICE</Text><TextInput testID="admin-remove-ads-price" value={settings.remove_ads_price} onChangeText={(remove_ads_price) => onChange({ ...settings, remove_ads_price })} style={styles.input} placeholder="Not configured" placeholderTextColor={colors.muted} /><PrimaryButton testID="admin-save-monetization" onPress={() => save(settings)} icon="save-outline">Save configuration</PrimaryButton></View></View>;
}

function ToggleRow({ title, value, onPress }: { title: string; value: boolean; onPress: () => void }) { const { colors } = useTheme(); const styles = useStyles(); return <Pressable onPress={onPress} style={styles.toggleRow}><Text style={styles.listTitle}>{title}</Text><View style={[styles.switch, { backgroundColor: value ? colors.brandPrimary : colors.border }]}><View style={[styles.knob, { alignSelf: value ? "flex-end" : "flex-start" }]} /></View></Pressable>; }

const useStyles = makeStyles((colors) => ({
  root: { flex: 1, backgroundColor: colors.surface },
  topbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "900" },
  spacer: { width: 44 },
  loginHeader: { marginTop: 42, gap: 18 },
  lock: { width: 52, height: 52, borderRadius: 18, backgroundColor: colors.brandPrimary, alignItems: "center", justifyContent: "center" },
  form: { marginTop: 32, gap: 10 },
  label: { color: colors.muted, fontSize: 10, fontWeight: "900", letterSpacing: 1.2, marginTop: 8 },
  input: { minHeight: 50, borderRadius: 14, backgroundColor: colors.surfaceSecondary, color: colors.onSurface, paddingHorizontal: 14, fontSize: 15, fontWeight: "700" },
  error: { color: colors.error, fontSize: 13, fontWeight: "700" },
  notice: { color: colors.success, fontSize: 13, fontWeight: "700" },
  helper: { fontSize: 12, fontWeight: "700", marginTop: 2 },
  note: { color: colors.muted, fontSize: 12, textAlign: "center", marginTop: 8 },
  adminHeader: { marginTop: 32, marginBottom: 22 },
  tabs: { flexDirection: "row", backgroundColor: colors.surfaceSecondary, borderRadius: 15, padding: 4, marginBottom: 24 },
  tab: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  activeTab: { backgroundColor: colors.brandPrimary },
  tabText: { color: colors.muted, fontSize: 11, fontWeight: "900", textTransform: "capitalize" },
  activeTabText: { color: colors.onBrandPrimary },
  panelHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  panelTitle: { color: colors.onSurface, fontSize: 19, fontWeight: "900" },
  panelSub: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 6, marginBottom: 17 },
  editor: { backgroundColor: colors.surfaceSecondary, borderRadius: 20, padding: 15, gap: 8, marginBottom: 17 },
  editorActions: { flexDirection: "row", gap: 9, alignItems: "center", marginTop: 8 },
  save: { flex: 1 },
  chips: { gap: 7, paddingVertical: 4 },
  chip: { minHeight: 35, paddingHorizontal: 11, borderRadius: 99, backgroundColor: colors.surfaceTertiary, justifyContent: "center" },
  chipActive: { backgroundColor: colors.brandPrimary },
  chipText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "800" },
  chipTextActive: { color: colors.onBrandPrimary },
  tierRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  tierChip: { flex: 1, minHeight: 42, borderRadius: 14, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  tierChipActive: { backgroundColor: colors.brandPrimary },
  tierChipText: { color: colors.muted, fontSize: 13, fontWeight: "900" },
  tierChipTextActive: { color: colors.onBrandPrimary },
  correctRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  correctChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.surfaceTertiary },
  correctChipActive: { backgroundColor: colors.success },
  correctChipText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "800" },
  correctChipTextActive: { color: colors.onSuccess },
  imagePicker: { minHeight: 140, borderRadius: 18, backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center", gap: 6, overflow: "hidden" },
  imagePickerText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  imagePreview: { width: "100%", height: 180 },
  challengeCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 16, backgroundColor: colors.surfaceSecondary, marginBottom: 10 },
  thumb: { width: 54, height: 54, borderRadius: 12 },
  thumbEmpty: { backgroundColor: colors.surfaceTertiary, alignItems: "center", justifyContent: "center" },
  iconBtn: { padding: 6 },
  listRow: { minHeight: 71, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", alignItems: "center", gap: 12 },
  listCopy: { flex: 1, gap: 4 },
  listTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "800" },
  listSub: { color: colors.muted, fontSize: 11, fontWeight: "600" },
  emptyBlock: { alignItems: "center", gap: 8, paddingVertical: 24 },
  emptyText: { color: colors.muted, fontSize: 12, fontWeight: "700", textAlign: "center", maxWidth: 260 },
  toggleRow: { minHeight: 62, borderBottomWidth: 1, borderBottomColor: colors.divider, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  switch: { width: 47, height: 28, borderRadius: 99, padding: 3, justifyContent: "center" },
  knob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.onBrandPrimary },
  moneyCard: { marginTop: 17, backgroundColor: colors.surfaceSecondary, borderRadius: 20, padding: 15, gap: 8 },
}));
