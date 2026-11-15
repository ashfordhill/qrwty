#!/usr/bin/env bash
# Every arm-A resource in the trial project, by name: qrwtya- or one of the three click-events names.
P=project-f46f6d6a-8e74-42a0-ab1; R=us-central1
f() { grep -E '(^|/)(qrwtya-|click-events)' || true; }
echo "## run services"; gcloud run services list --project $P --region $R --format='value(metadata.name)' 2>/dev/null | f
echo "## run jobs"; gcloud run jobs list --project $P --region $R --format='value(metadata.name)' 2>/dev/null | f
echo "## run worker pools"; gcloud beta run worker-pools list --project $P --region $R --format='value(metadata.name)' 2>/dev/null | f
echo "## cloud sql"; gcloud sql instances list --project $P --format='value(name)' 2>/dev/null | f
echo "## memorystore"; gcloud memorystore instances list --project $P --location $R --format='value(name)' 2>/dev/null | sed 's#.*/##' | f
echo "## pubsub topics"; gcloud pubsub topics list --project $P --format='value(name)' 2>/dev/null | sed 's#.*/##' | f
echo "## pubsub subscriptions"; gcloud pubsub subscriptions list --project $P --format='value(name)' 2>/dev/null | sed 's#.*/##' | f
echo "## storage buckets"; gcloud storage buckets list --project $P --format='value(name)' 2>/dev/null | f
echo "## secrets"; gcloud secrets list --project $P --format='value(name)' 2>/dev/null | sed 's#.*/##' | f
echo "## service accounts"; gcloud iam service-accounts list --project $P --format='value(email)' 2>/dev/null | sed 's/@.*//' | f
echo "## networks"; gcloud compute networks list --project $P --format='value(name)' 2>/dev/null | f
echo "## subnets"; gcloud compute networks subnets list --project $P --format='value(name)' 2>/dev/null | f
echo "## global addresses"; gcloud compute addresses list --project $P --global --format='value(name)' 2>/dev/null | f
echo "## routers"; gcloud compute routers list --project $P --format='value(name)' 2>/dev/null | f
echo "## forwarding rules on qrwtya-vpc"; gcloud compute forwarding-rules list --project $P --filter='network~qrwtya-vpc' --format='value(name)' 2>/dev/null
echo "## service connection policies"; gcloud network-connectivity service-connection-policies list --project $P --region $R --format='value(name)' 2>/dev/null | sed 's#.*/##' | f
echo "## artifact registry"; gcloud artifacts repositories list --project $P --location $R --format='value(name)' 2>/dev/null | sed 's#.*/##' | f
echo "## vpc peerings on qrwtya-vpc"; gcloud compute networks peerings list --network=qrwtya-vpc --project $P --format='value(peerings[].name)' 2>/dev/null
echo "## project IAM members qrwtya-"; gcloud projects get-iam-policy $P --format=json 2>/dev/null | python3 -c 'import json,sys; d=json.load(sys.stdin); [print(b["role"], m.split("@")[0]) for b in d["bindings"] for m in b["members"] if "qrwtya-" in m]'
