import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Linking,
} from "react-native";
import Signature from "react-native-signature-canvas";
import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams } from "expo-router";
import api from "../../../../utils/api";
import useSubscriptionStore, { PlanType } from "../../../../store/useSubscriptionStore";

/**
 * AgreementScreen
 *
 * Props (via search params / route.params):
 *  - planType: "3_MONTHS" | "6_MONTHS"
 *
 * Behavior:
 *  - Renders agreement text based on planType (based on your Agreement_v3 / Agreement_v6 files)
 *  - Collects full name, date, signature
 *  - On submit, posts to /subscription/extend { planType } to extend subscription
 *  - After successful submission, redirects user to STRIPE_LINK
 */

const STRIPE_LINK = "https://buy.stripe.com/cNi4gBcg4gswfwv0bb8N202";

const AGREEMENT_TEXTS: Record<PlanType, string> = {
  "3_MONTHS": `
By signing below, you agree to pay the full program fee of USD $450.00 + Applicable sales tax (either upfront, or in monthly payments of USD $150.00 + Applicable sales tax for the next two months remaining to pay off the total program cost of USD $450.00).

IF YOU CHOOSE TO PAY IN MONTHLY INCREMENTS.. ONCE THE FIRST PAYMENT HAS BEEN MADE YOU ARE OBLIGATED TO PAY THE REMAINING BALANCE OF THE TOTAL COST FOR THIS COACHING PROGRAM, REGARDLESS OF USAGE OR PARTICIPATION.

YOU GIVE ME (Ashton), FULL PERMISSION TO HOLD YOU ACCOUNTABLE TO THE FULLEST AT ALL TIMES, THROUGHOUT OUR TRAINER AND TRAINEE EXPERIENCE TOGETHER.

I AM ENABLED TO RELEASE YOU AS A CLIENT IF YOU DO NOT FOLLOW MY INSTRUCTIONS AND FOLLOW THEM WHEN I GIVE THEM TO YOU. THIS INCLUDES...

NOT FOLLOWING THE MEAL PLAN AS WELL AS WORKOUT PLAN THAT I’VE SET OUT FOR YOU.

EATING OUTSIDE OF THE WINDOW I’VE GIVEN YOU.

REFUSING/CONSISTENTLY REFUSING TO LOG YOUR FOOD INTAKE FOR THE DAY.

CHOOSING NOT TO WORK OUT BECAUSE YOU DON’T FEEL LIKE IT.

NOT LIFTING THE RECOMMENDED WEIGHT IN LBS, AS WELL AS LIFTING THE RECOMMENDED AMOUNT OF REPS.

THERE ARE NO REFUNDS + NO CHARGEBACKS. This is a binding agreement.

This agreement outlines the terms between you (__________) and (SCULPT BY ASHTON) for a 3 month online personal training/coaching program. You understand that:

The total fee for the program is $450 USD + Applicable sales tax.

You may choose to pay in full upfront or in 3 equal monthly payments of USD $150.00 + Applicable sales tax.

If you’re paying in monthly increments, You may choose to pay off the total coaching cost early at anytime.

No refunds will be issued under any circumstances, including but not limited to dissatisfaction, lack of participation, schedule conflicts, or personal matters.

Chargebacks or payment reversals will be considered a breach of this agreement and may result in legal action/collection efforts.

This program is non-transferable.

By signing, you acknowledge that you have read, understood, and agree to these terms in full.
  `,
  "6_MONTHS": `
By signing below, you agree to pay the full program fee of USD $900.00 + Applicable sales tax (either upfront, or in monthly payments of USD $150.00 + Applicable sales tax for the next five months remaining to pay off the total program cost of USD $900.00).

IF YOU CHOOSE TO PAY IN MONTHLY INCREMENTS.. ONCE THE FIRST PAYMENT HAS BEEN MADE YOU ARE OBLIGATED TO PAY THE REMAINING BALANCE OF THE TOTAL COST FOR THIS COACHING PROGRAM, REGARDLESS OF USAGE OR PARTICIPATION.

YOU GIVE ME (Ashton), FULL PERMISSION TO HOLD YOU ACCOUNTABLE TO THE FULLEST AT ALL TIMES, THROUGHOUT OUR TRAINER AND TRAINEE EXPERIENCE TOGETHER.

I AM ENABLED TO RELEASE YOU AS A CLIENT IF YOU DO NOT FOLLOW MY INSTRUCTIONS AND FOLLOW THEM WHEN I GIVE THEM TO YOU. THIS INCLUDES...

NOT FOLLOWING THE MEAL PLAN AS WELL AS WORKOUT PLAN THAT I’VE SET OUT FOR YOU.

EATING OUTSIDE OF THE WINDOW I’VE GIVEN YOU.

REFUSING/CONSISTENTLY REFUSING TO LOG YOUR FOOD INTAKE FOR THE DAY.

CHOOSING NOT TO WORK OUT BECAUSE YOU DON’T FEEL LIKE IT.

NOT LIFTING THE RECOMMENDED WEIGHT IN LBS, AS WELL AS LIFTING THE RECOMMENDED AMOUNT OF REPS.

THERE ARE NO REFUNDS + NO CHARGEBACKS. This is a binding agreement.

This agreement outlines the terms between you (__________) and (SCULPT BY ASHTON) for a 6 month online personal training/coaching program. You understand that:

The total fee for the program is $900 USD + Applicable sales tax.

You may choose to pay in full upfront or in 6 equal monthly payments of USD $150.00 + Applicable sales tax.

If you’re paying in monthly increments, You may choose to pay off the total coaching cost early at anytime.

No refunds will be issued under any circumstances, including but not limited to dissatisfaction, lack of participation, schedule conflicts, or personal matters.

Chargebacks or payment reversals will be considered a breach of this agreement and may result in legal action/collection efforts.

This program is non-transferable.

By signing, you acknowledge that you have read, understood, and agree to these terms in full.
  `,
};

const AgreementScreen = () => {
  const { planType } = useLocalSearchParams<{ planType: PlanType }>();
  const navigation = useNavigation();
  const [clientName, setClientName] = useState("");
  const [date, setDate] = useState("");
  const [signature, setSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sigRef = useRef<any>(null);
  const { fetchMySubscription } = useSubscriptionStore();

  const handleOK = (sig: string) => {
    // sig is base64 encoded png data URI
    setSignature(sig);
  };

  const handleEmpty = () => {
    setSignature(null);
  };

  const handleClear = () => {
    sigRef.current?.clearSignature();
    setSignature(null);
  };

  const handleSubmit = async () => {
    if (!clientName || !date || !signature) {
      Alert.alert("Please complete the form and sign the agreement.");
      return;
    }

    try {
      setLoading(true);

      // Optional: send signature to an endpoint for record keeping
      // await api.post('/agreements', { planType, clientName, date, signature });

      // Call subscription extend endpoint
      await api.post("/subscription/extend", { planType });

      // Refresh locally cached subscription if needed
      try {
        await fetchMySubscription();
      } catch (err) {
        console.warn("Failed to refresh subscription store", err);
      }

      // Attempt to open Stripe link
      try {
        const supported = await Linking.canOpenURL(STRIPE_LINK);
        if (supported) {
          await Linking.openURL(STRIPE_LINK);
        } else {
          console.warn("Cannot open URL:", STRIPE_LINK);
          Alert.alert("Could not open payment link");
        }
      } catch (linkErr) {
        console.warn("Error opening Stripe link", linkErr);
        Alert.alert("Failed to open payment link");
      }

      Alert.alert(
        "Agreement signed",
        "Thank you. Your subscription has been updated.",
        [
          {
            text: "OK",
            onPress: () => {
              // Go back or to main screen
              // @ts-ignore
              navigation.goBack();
            },
          },
        ]
      );
    } catch (err) {
      console.error("Extend subscription error", err);
      Alert.alert("Failed to extend subscription", "Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const agreementText = AGREEMENT_TEXTS[planType];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        {planType === "3_MONTHS" ? "3-Month Agreement" : "6-Month Agreement"}
      </Text>

      <View style={styles.agreementBox}>
        <Text style={styles.agreementText}>{agreementText}</Text>
      </View>

      <Text style={styles.label}>Full Name</Text>
      <TextInput
        value={clientName}
        onChangeText={setClientName}
        placeholder="Enter your full name"
        placeholderTextColor="#8e8e8e"
        style={styles.input}
      />

      <Text style={styles.label}>Date</Text>
      <TextInput
        value={date}
        onChangeText={setDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#8e8e8e"
        style={styles.input}
      />

      <Text style={[styles.label, { marginTop: 8 }]}>Signature</Text>
      <View style={styles.signatureWrap}>
        <Signature
          ref={sigRef}
          onOK={handleOK}
          onEmpty={handleEmpty}
          descriptionText="Sign above"
          clearText="Clear"
          confirmText="Save"
          webStyle={signaturePadStyle}
          autoClear={false}
        />
      </View>

      <View style={{ marginTop: 12 }}>
        <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
          <Text style={styles.clearBtnText}>Clear Signature</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.submitBtn, loading && { opacity: 0.8 }]}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.submitBtnText}>Sign & Confirm</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default AgreementScreen;

const signaturePadStyle = `
  .m-signature-pad { box-shadow: none; border: none; }
  .m-signature-pad--body { border: 1px solid #cfcfcf; }
  .m-signature-pad--footer { display: none; margin: 0px; }
  body,html { height: 100%; }
`;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
  },

  agreementBox: {
    backgroundColor: "#0b0b0b",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#151515",
    marginBottom: 16,
  },
  agreementText: {
    color: "#dcdcdc",
    lineHeight: 20,
    fontSize: 13,
  },

  label: {
    color: "#bfbfbf",
    fontWeight: "700",
    marginTop: 6,
    marginBottom: 4,
  },
  input: {
    backgroundColor: "#0f0f0f",
    color: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#151515",
  },

  signatureWrap: {
    height: 200,
    borderWidth: 1,
    borderColor: "#151515",
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 8,
  },

  clearBtn: {
    marginTop: 8,
    alignSelf: "flex-start",
  },
  clearBtnText: {
    color: "#bfbfbf",
  },

  submitBtn: {
    marginTop: 18,
    backgroundColor: "#fff",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
});