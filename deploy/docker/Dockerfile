FROM eclipse-temurin:17.0.4.1_1-jre-focal

COPY cloudbeaver /opt/cloudbeaver

# 允许使用TLS1.0
RUN sed -i -e '724,+2s/TLSv1,//' -e '724,+2s/TLSv1.1,//' -e '724,+2s/3DES_EDE_CBC,//' /opt/java/openjdk/conf/security/java.security
EXPOSE 8978
RUN find /opt/cloudbeaver -type d -exec chmod 775 {} \;
WORKDIR /opt/cloudbeaver/
ENTRYPOINT ["./run-server.sh"]
