package com.oduvamarga.bff.configuration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.cloud.gateway.route.RouteLocator;
import org.springframework.cloud.gateway.route.builder.RouteLocatorBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RouteLocatorConfiguration {

    final private String odumargaUri;

    public RouteLocatorConfiguration (@Value("${oduva.service-base-url}") String odumargaUri) {
        this.odumargaUri = odumargaUri;
    }

    @Bean
    public RouteLocator customRouteLocator(RouteLocatorBuilder builder) {
        final String pathRewriteRegex = "/bff/om/?(?<remaining>.*)";
        final String pathRewriteReplacement = "/api/v1/${remaining}";
        return builder.routes()
                .route("om-public-routes", r -> r
                        .path(
                                "/bff/om/student/register",
                                "/bff/om/public/**"
                        )
                        .filters(f -> f
                                .rewritePath(pathRewriteRegex, pathRewriteReplacement)
                                .removeRequestHeader("Cookie")
                        )
                        .uri(odumargaUri)
                )
                .route("om-resource-server", r -> r
                        .path("/bff/om/**")
                        .filters(f -> f
                                .rewritePath(pathRewriteRegex, pathRewriteReplacement)
                                .tokenRelay()
                                .removeRequestHeader("Cookie")
                        )
                        .uri(odumargaUri)
                )
                .build();
    }
}
