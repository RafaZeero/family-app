package types

type WSPayload struct {
	Action   string `json:"action"`
	Stream   string `json:"stream"`
	IP       string `json:"ip"`
	Username string `json:"username"`
	Password string `json:"password"`
}
