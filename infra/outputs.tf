output "elastic_ip" {
  description = "Static public IP address for the EC2 instance."
  value       = aws_eip.app.public_ip
}

output "app_url" {
  description = "HTTP URL for the deployed app."
  value       = "http://${aws_eip.app.public_ip}"
}

output "health_url" {
  description = "Health check URL for the deployed app."
  value       = "http://${aws_eip.app.public_ip}/health"
}
